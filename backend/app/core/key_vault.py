"""In-process BYOK key vault.

Keys are held only in memory, keyed by thread_id. They are deliberately NOT part of
the LangGraph state, so they are never written to the SQLite checkpoint, the event
log, or any API response. After a server restart the researcher must re-supply them
(the HITL endpoint accepts them again).
"""
from typing import Dict, Optional, Tuple

_vault: Dict[str, Tuple[Optional[str], Optional[str]]] = {}


def set_keys(thread_id: str, gemini: Optional[str], groq: Optional[str]) -> None:
    gemini = (gemini or "").strip() or None
    groq = (groq or "").strip() or None
    if gemini or groq:
        _vault[thread_id] = (gemini, groq)


def get_keys(thread_id: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    if not thread_id:
        return None, None
    return _vault.get(thread_id, (None, None))


def clear(thread_id: str) -> None:
    _vault.pop(thread_id, None)
