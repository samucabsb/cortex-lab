"""Provenance primitives (Zero-Fake).

Every scientific value shown to the researcher is an ``Evidence``: either a value
anchored to a verbatim quote of the source text, or an explicit ``not_found`` /
``needs_human_review`` marker. Nothing is ever inferred silently.
"""
import re
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel

NOT_FOUND = "not_found"
NEEDS_REVIEW = "needs_human_review"

EvidenceStatus = Literal["found", "not_found", "needs_human_review"]

MAX_QUOTE_CHARS = 400


class Evidence(BaseModel):
    status: EvidenceStatus
    value: str
    quote: Optional[str] = None
    source: Optional[str] = None  # "abstract" | "human"
    doi: Optional[str] = None
    method: Optional[str] = None  # "regex" | "llm_verified" | "human"
    note: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return self.model_dump()


def found(
    value: str,
    quote: str,
    doi: Optional[str] = None,
    method: str = "regex",
    source: str = "abstract",
) -> Dict[str, Any]:
    return Evidence(
        status="found",
        value=value,
        quote=quote[:MAX_QUOTE_CHARS],
        source=source,
        doi=doi,
        method=method,
    ).as_dict()


def not_found(note: Optional[str] = None, doi: Optional[str] = None) -> Dict[str, Any]:
    return Evidence(status="not_found", value=NOT_FOUND, note=note, doi=doi).as_dict()


def needs_review(
    note: Optional[str] = None,
    doi: Optional[str] = None,
    quote: Optional[str] = None,
) -> Dict[str, Any]:
    return Evidence(
        status="needs_human_review",
        value=NEEDS_REVIEW,
        note=note,
        doi=doi,
        quote=quote[:MAX_QUOTE_CHARS] if quote else None,
        source="abstract" if quote else None,
    ).as_dict()


def _normalize(text: str) -> str:
    text = (text or "").replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"\s+", " ", text).strip().casefold()


def quote_in_text(quote: Optional[str], text: Optional[str]) -> bool:
    """True only if ``quote`` is a verbatim (whitespace/case-insensitive) substring of ``text``."""
    if not quote or not text:
        return False
    q = _normalize(quote)
    return len(q) >= 8 and q in _normalize(text)


def numbers_supported_by_quote(value: str, quote: str) -> bool:
    """Every number in ``value`` must literally appear in ``quote`` (blocks invented figures)."""
    numbers = re.findall(r"\d+(?:[.,]\d+)?", value or "")
    if not numbers:
        return False
    normalized_quote = _normalize(quote).replace(",", "")
    return all(n.replace(",", "") in normalized_quote for n in numbers)


def sentence_around(text: str, start: int, end: int) -> str:
    """Returns the sentence of ``text`` containing the span [start, end)."""
    left = max(text.rfind(". ", 0, start), text.rfind("? ", 0, start), text.rfind("! ", 0, start))
    newline = text.rfind("\n", 0, start)
    begin = max(left + 1 if left != -1 else 0, newline + 1 if newline != -1 else 0)
    tail = re.search(r"[.!?](?:\s|$)", text[end:])
    stop = end + tail.end() if tail else len(text)
    return text[begin:stop].strip()
