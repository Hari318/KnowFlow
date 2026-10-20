from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.access import get_workspace_or_404
from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.repositories.document_chunk_repository import (
    DocumentChunkRepository,
    get_document_chunk_repository,
)
from app.repositories.document_repository import DocumentRepository, get_document_repository
from app.schemas.rag import AskRequest, AskResponse, SourceChunk
from app.services.embeddings import EmbeddingProvider, get_embedding_provider
from app.services.llm import LLMProvider, get_llm_provider
from app.core.config import settings
from app.services.rate_limit import check_rate_limit
from app.api.ai_guard import require_ai_access
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces/{workspace_id}/ask", tags=["rag"])


def _get_chunk_repo(db: Session = Depends(get_db)) -> DocumentChunkRepository:
    return get_document_chunk_repository(db)


def _get_doc_repo(db: Session = Depends(get_db)) -> DocumentRepository:
    return get_document_repository(db)


def _clean_history(items) -> list[dict]:
    """Keep the last 6 turns, alternating roles, starting with user and ending with assistant."""
    cleaned: list[dict] = []
    for m in items[-6:]:
        entry = {"role": m.role, "content": m.content[:2000]}
        if cleaned and cleaned[-1]["role"] == m.role:
            cleaned[-1] = entry
        else:
            cleaned.append(entry)
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    if cleaned and cleaned[-1]["role"] == "user":
        cleaned.pop()
    return cleaned

def _rerank_results(embeddings, query: str, results: list, top_k: int) -> list:
    """Reorder vector-search hits with the reranker; fall back to vector order on any failure."""
    try:
        order = embeddings.rerank(query, [chunk.content for chunk, _ in results], top_k)
    except Exception:
        logger.warning("rerank failed, using vector order", exc_info=True)
        return results[:top_k]
    return [results[i] for i in order]

@router.post("", response_model=AskResponse, dependencies=[Depends(require_ai_access)])
def ask_workspace(
        workspace_id: uuid.UUID,
        payload: AskRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        embeddings: EmbeddingProvider = Depends(get_embedding_provider),
        chunk_repo: DocumentChunkRepository = Depends(_get_chunk_repo),
        doc_repo: DocumentRepository = Depends(_get_doc_repo),
        llm: LLMProvider = Depends(get_llm_provider),
):
    get_workspace_or_404(workspace_id, current_user, db)

    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Please enter a question.")
    if len(question) > settings.max_question_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Question is too long (max {settings.max_question_chars} characters).",
        )

    uid = str(current_user.id)
    check_rate_limit("ask-min", uid, settings.ask_limit_per_minute, 60)
    check_rate_limit("ask-hour", uid, settings.ask_limit_per_hour, 3600)
    check_rate_limit("ask-day", uid, settings.ask_limit_per_day, 86400)

    history = _clean_history(payload.history)
    try:
        search_query = llm.condense_question(history, question) if history else question
        query_vector = embeddings.embed_query(search_query)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    final_k = 10 if payload.document_id else 8
    if payload.document_id:
        candidates_k = settings.whole_doc_max_chunks + 1
    elif settings.rerank_enabled:
        candidates_k = settings.rerank_candidates
    else:
        candidates_k = final_k

    results = chunk_repo.search_similar(
        workspace_id, query_vector, limit=candidates_k,
        collection_id=payload.collection_id, document_id=payload.document_id,
    )

    if not results:
        scoped = payload.collection_id or payload.document_id
        raise HTTPException(
            status_code=404,
            detail=(
                "No indexed documents found in the selected scope. "
                "Index a document first, or choose a different scope."
                if scoped
                else "No ingested documents found in this workspace. Ingest a document first."
            ),
        )

    if payload.document_id and len(results) <= settings.whole_doc_max_chunks:
        pass  # small document: send every chunk, ranking can only lose information
    elif settings.rerank_enabled and len(results) > 1:
        results = _rerank_results(embeddings, search_query, results, final_k)
    else:
        results = results[:final_k]

    if payload.document_id:
        # single document: present chunks in reading order
        results = sorted(results, key=lambda r: r[0].chunk_index)

    context_texts = [chunk.content for chunk, _ in results]

    try:
        answer = llm.answer_with_context(question, context_texts, history)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    sources = []
    for chunk, distance in results:
        document = doc_repo.get_by_id(chunk.document_id)
        sources.append(
            SourceChunk(
                document_id=chunk.document_id,
                document_name=document.name if document else "Unknown",
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                similarity=round(1 - distance, 4),
                collection_id=document.collection_id if document else None
            )
        )

    return AskResponse(answer=answer, sources=sources)
