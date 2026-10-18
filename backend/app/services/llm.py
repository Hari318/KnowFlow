from __future__ import annotations

from typing import Protocol

import anthropic
import logging

from app.core.config import settings

MAX_INPUT_CHARS = 40_000  # keep prompts within a safe context-window budget

logger = logging.getLogger(__name__)

class LLMProvider(Protocol):
    def summarize(self, text: str) -> str: ...
    def condense_question(self, history: list[dict], question: str) -> str: ...
    def answer_with_context(
            self, question: str, context_chunks: list[dict] | list[str], history: list[dict] | None = None
    ) -> str: ...

class AnthropicLLMProvider:
    def __init__(self) -> None:
        self._client = (
            anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=30.0)
            if settings.anthropic_api_key
            else None
        )

    def summarize(self, text: str) -> str:
        if self._client is None:
            raise RuntimeError(
                "Summarization is unavailable: ANTHROPIC_API_KEY is not configured."
            )

        truncated = text[:MAX_INPUT_CHARS]

        try:
            message = self._client.messages.create(
                model=settings.llm_summary_model,
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Summarize the following document. Start with one short "
                            "introductory sentence describing what the document is, "
                            "then list 3-6 key points as a bulleted list, one per line, "
                            "each starting with '- '. Write in plain text only — no "
                            "markdown formatting, no bold, no asterisks.\n\n"
                            f"{truncated}"
                        ),
                    }
                ],
            )
        except anthropic.APIError as e:
            logger.error("Anthropic call failed: %s", e)
            raise RuntimeError(
                "The AI service is temporarily unavailable. Please try again later."
            ) from e
        return message.content[0].text

    def condense_question(self, history: list[dict], question: str) -> str:
        if self._client is None:
            raise RuntimeError("This feature is unavailable: ANTHROPIC_API_KEY is not configured.")
        transcript = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in history[-4:])
        try:
            message = self._client.messages.create(
                model=settings.llm_answer_model,
                max_tokens=150,
                messages=[{
                    "role": "user",
                    "content": (
                        "Rewrite the follow-up question as a standalone search query that includes "
                        "any context it needs from the conversation. If it is already standalone, "
                        "return it unchanged. Output only the query.\n\n"
                        f"Conversation:\n{transcript}\n\nFollow-up: {question}"
                    ),
                }],
            )
        except anthropic.APIError:
            return question  # fall back to the raw question
        return message.content[0].text.strip() or question

    def answer_with_context(self, question: str, context_chunks: list[str], history: list[dict] | None = None) -> str:
        if self._client is None:
            raise RuntimeError("This feature is unavailable: ANTHROPIC_API_KEY is not configured.")

        context = "\n\n---\n\n".join(
            f"[Source {i + 1}]\n{chunk}" for i, chunk in enumerate(context_chunks)
        )

        try:
            message = self._client.messages.create(
                model=settings.llm_answer_model,
                max_tokens=1500,
                messages=[
                    *(history or []),
                    {
                        "role": "user",
                        "content": (
                            "Earlier messages are conversation context only; [Source N] numbers refer only to the sources below."
                            "Answer the question using ONLY the information in the sources "
                            "below. If the sources don't contain enough information to answer, "
                            "say so clearly rather than guessing. When you use information from "
                            "a source, reference it by its number, like [Source 1].\n\n"
                            f"Sources:\n\n{context}\n\n"
                            f"Question: {question}"
                        ),
                    }
                ],
            )
        except anthropic.APIError as e:
            logger.error("Anthropic call failed: %s", e)
            raise RuntimeError(
                "The AI service is temporarily unavailable. Please try again later."
            ) from e
        return message.content[0].text

_llm_provider: LLMProvider = AnthropicLLMProvider()


def get_llm_provider() -> LLMProvider:
    return _llm_provider