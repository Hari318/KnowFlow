from __future__ import annotations

import re

# ~4 characters per token for English, so 1200 chars is roughly 300 tokens.
MAX_CHARS = 1200
OVERLAP_CHARS = 150
MIN_CHARS = 400

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n")


def _split_long(piece: str, max_chars: int) -> list[str]:
    """Break one oversized paragraph into sentence/line groups, then words."""
    parts: list[str] = []
    for sentence in _SENTENCE_SPLIT.split(piece):
        sentence = sentence.strip()
        if not sentence:
            continue
        while len(sentence) > max_chars:  # one giant "sentence" (minified text, etc.)
            cut = sentence.rfind(" ", 0, max_chars)
            if cut <= 0:
                cut = max_chars
            parts.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if sentence:
            parts.append(sentence)

    groups: list[str] = []
    current = ""
    for part in parts:
        if current and len(current) + 1 + len(part) > max_chars:
            groups.append(current)
            current = part
        else:
            current = f"{current} {part}".strip() if current else part
    if current:
        groups.append(current)
    return groups


def _tail(text: str, overlap: int) -> str:
    """Last `overlap` characters, starting at a word boundary."""
    if overlap <= 0 or len(text) <= overlap:
        return "" if overlap <= 0 else text
    tail = text[-overlap:]
    space = tail.find(" ")
    return tail[space + 1 :] if space != -1 else tail


def chunk_text(
    text: str, max_chars: int = MAX_CHARS, overlap: int = OVERLAP_CHARS
) -> list[str]:
    text = text.replace("\r\n", "\n").strip()
    if not text:
        return []

    # 1) Paragraph-level pieces, each tagged with the heading it sits under.
    pieces: list[tuple[str, str]] = []
    heading = ""
    pending = ""  # a lone heading line waits to be glued to the paragraph below it
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        if para.startswith("#"):
            heading = para.splitlines()[0].lstrip("#").strip()
            if "\n" not in para and len(para) < 200:
                pending = para
                continue
        if pending:
            para = f"{pending}\n\n{para}"
            pending = ""
        if len(para) > max_chars:
            pieces.extend((heading, p) for p in _split_long(para, max_chars))
        else:
            pieces.append((heading, para))
    if pending:
        pieces.append((heading, pending))

    # 2) Pack pieces into chunks. Split on size, or on a heading change
    #    once the current chunk already has MIN_CHARS of text.
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    current_heading = ""  # heading of the first piece in the current chunk
    last_heading = ""     # heading of the most recent piece

    def flush(carry_overlap: bool) -> str:
        nonlocal current, current_len
        body = "\n\n".join(current).strip()
        if body:
            label = current_heading
            if label and not body.lstrip().startswith("#"):
                body = f"{label}\n\n{body}"
            chunks.append(body)
        tail = _tail("\n\n".join(current), overlap) if carry_overlap else ""
        current, current_len = [], 0
        return tail

    for piece_heading, piece in pieces:
        heading_changed = (
            bool(current)
            and piece_heading != last_heading
            and current_len >= MIN_CHARS
        )
        too_big = bool(current) and current_len + len(piece) + 2 > max_chars
        if heading_changed or too_big:
            tail = flush(carry_overlap=not heading_changed)
            if tail:
                current.append(tail)
                current_len = len(tail)
        if not current:
            current_heading = piece_heading
        last_heading = piece_heading
        current.append(piece)
        current_len += len(piece) + 2

    flush(carry_overlap=False)
    return chunks