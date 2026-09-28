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

router = APIRouter(prefix="/workspaces/{workspace_id}/ask", tags=["rag"])

def _get_chunk_repo(db: Session = Depends(get_db)) -> DocumentChunkRepository:
    return get_document_chunk_repository(db)

def _get_doc_repo(db: Session = Depends(get_db)) -> DocumentRepository:
    return get_document_repository(db)

@router.post("", response_model=AskResponse)
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

    try:
        query_vector = embeddings.embed_query(payload.question)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    results = chunk_repo.search_similar(workspace_id, query_vector, limit=5)

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ingested documents found in this workspace. Ingest a document first.",
        )

    context_texts = [chunk.content for chunk, _ in results]

    try:
        answer = llm.answer_with_context(payload.question, context_texts)
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
            )
        )

    return AskResponse(answer=answer, sources=sources)