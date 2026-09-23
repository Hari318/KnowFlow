from __future__ import annotations

import io

import docx
from pypdf import PdfReader


def extract_text(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return _extract_pdf(file_bytes)
    if file_type == "docx":
        return _extract_docx(file_bytes)
    if file_type in ("txt", "md", "markdown"):
        return file_bytes.decode("utf-8", errors="replace")

    raise ValueError(f"Unsupported file type for text extraction: {file_type}")


def _extract_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


def _extract_docx(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in document.paragraphs]
    return "\n".join(paragraphs)