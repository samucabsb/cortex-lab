"""Real telemetry: an append-only, replayable event log per review thread.

Agents emit events *while they work* (API call started/finished, DOI checked, ...).
Events are kept in memory for live SSE subscribers and persisted to SQLite so the
log is auditable and survives a restart.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional

import aiosqlite

logger = logging.getLogger("cortexlab.events")

# Agent ids are roles; the UI maps them to the scientists' names.
AGENT_COORDINATOR = "coordinator"
AGENT_SEARCHER = "searcher"
AGENT_VALIDATOR = "validator"
AGENT_EXTRACTOR = "extractor"
AGENT_BIAS_AUDITOR = "bias_auditor"
AGENT_SYNTHESIZER = "synthesizer"
AGENT_HUMAN = "human"
AGENT_SYSTEM = "system"

TERMINAL_KINDS = {"run_completed", "run_error"}


class EventBus:
    def __init__(self) -> None:
        self._db: Optional[aiosqlite.Connection] = None
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._conds: Dict[str, asyncio.Condition] = {}

    async def start(self, db_path: Optional[str]) -> None:
        self._cache.clear()
        self._conds.clear()
        if not db_path:
            self._db = None
            return
        self._db = await aiosqlite.connect(db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA busy_timeout=5000")
        await self._db.execute(
            "CREATE TABLE IF NOT EXISTS agent_events ("
            "thread_id TEXT NOT NULL, seq INTEGER NOT NULL, payload TEXT NOT NULL, "
            "PRIMARY KEY (thread_id, seq))"
        )
        await self._db.commit()

    async def stop(self) -> None:
        if self._db is not None:
            await self._db.close()
            self._db = None

    def _cond(self, thread_id: str) -> asyncio.Condition:
        if thread_id not in self._conds:
            self._conds[thread_id] = asyncio.Condition()
        return self._conds[thread_id]

    async def _events(self, thread_id: str) -> List[Dict[str, Any]]:
        if thread_id not in self._cache:
            loaded: List[Dict[str, Any]] = []
            if self._db is not None:
                async with self._db.execute(
                    "SELECT payload FROM agent_events WHERE thread_id = ? ORDER BY seq", (thread_id,)
                ) as cur:
                    async for (payload,) in cur:
                        loaded.append(json.loads(payload))
            self._cache[thread_id] = loaded
        return self._cache[thread_id]

    async def emit(
        self,
        thread_id: str,
        agent: str,
        kind: str,
        message: str,
        *,
        status: Optional[str] = None,
        source: Optional[str] = None,
        **data: Any,
    ) -> Dict[str, Any]:
        events = await self._events(thread_id)
        async with self._cond(thread_id):
            event = {
                "seq": len(events) + 1,
                "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
                "thread_id": thread_id,
                "agent": agent,
                "kind": kind,
                "status": status,
                "source": source,
                "message": message,
                "data": data,
            }
            events.append(event)
            if self._db is not None:
                try:
                    await self._db.execute(
                        "INSERT INTO agent_events (thread_id, seq, payload) VALUES (?, ?, ?)",
                        (thread_id, event["seq"], json.dumps(event, ensure_ascii=False, default=str)),
                    )
                    await self._db.commit()
                except Exception as exc:  # telemetry must never kill a run
                    logger.warning("Could not persist event %s/%s: %s", thread_id, event["seq"], exc)
            self._conds[thread_id].notify_all()
        return event

    async def history(self, thread_id: str, after: int = 0) -> List[Dict[str, Any]]:
        events = await self._events(thread_id)
        return events[after:]

    async def stream(
        self, thread_id: str, after: int = 0, heartbeat: float = 15.0
    ) -> AsyncIterator[Optional[Dict[str, Any]]]:
        """Yields events with seq > ``after`` as they happen; yields ``None`` as heartbeat."""
        events = await self._events(thread_id)
        cond = self._cond(thread_id)
        cursor = after
        while True:
            if len(events) > cursor:
                for event in events[cursor:]:
                    cursor = event["seq"]
                    yield event
                continue
            timed_out = False
            async with cond:
                if len(events) <= cursor:
                    try:
                        await asyncio.wait_for(cond.wait(), timeout=heartbeat)
                    except asyncio.TimeoutError:
                        timed_out = True
            if timed_out:
                yield None


_bus = EventBus()


def get_event_bus() -> EventBus:
    return _bus


def thread_id_from_config(config: Optional[Dict[str, Any]]) -> Optional[str]:
    return ((config or {}).get("configurable") or {}).get("thread_id")


async def emit_event(
    config: Optional[Dict[str, Any]],
    agent: str,
    kind: str,
    message: str,
    **kwargs: Any,
) -> Optional[Dict[str, Any]]:
    """Node-side helper. No-op when called outside a graph run (no thread_id)."""
    thread_id = thread_id_from_config(config)
    if not thread_id:
        return None
    return await _bus.emit(thread_id, agent, kind, message, **kwargs)
