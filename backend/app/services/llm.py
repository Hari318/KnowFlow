from __future__ import annotations

from typing import Protocol

import anthropic

from app.core.config import settings

MAX_INPUT_CHARS = 40_000  # keep prompts within a safe context-window budget


class LLMProvider(Protocol):
    def summarize(self, text: str) -> str: ...
    def answer_with_context(self, question: str, context_chunks: list[str]) -> str: ...

class AnthropicLLMProvider:
    def __init__(self) -> None:
        self._client = (
            anthropic.Anthropic(api_key=settings.anthropic_api_key)
            if settings.anthropic_api_key
            else None
        )

    def summarize(self, text: str) -> str:
        if self._client is None:
            raise RuntimeError(
                "Summarization is unavailable: ANTHROPIC_API_KEY is not configured."
            )

        truncated = text[:MAX_INPUT_CHARS]

        message = self._client.messages.create(
            model="claude-sonnet-4-5",
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
        return message.content[0].text

    def answer_with_context(self, question: str, context_chunks: list[str]) -> str:
        if self._client is None:
            raise RuntimeError("This feature is unavailable: ANTHROPIC_API_KEY is not configured.")

        context = "\n\n---\n\n".join(
            f"[Source {i + 1}]\n{chunk}" for i, chunk in enumerate(context_chunks)
        )

        message = self._client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": (
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
        return message.content[0].text

_llm_provider: LLMProvider = AnthropicLLMProvider()


def get_llm_provider() -> LLMProvider:
    return _llm_provider