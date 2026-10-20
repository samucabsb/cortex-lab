"""Runs the compiled LangGraph in the background and exposes its persisted state.

The router stays thin: it starts/resumes runs here and reads snapshots from here.
All workflow logic lives in the graph itself.
"""
import asyncio
import logging
from contextlib import AsyncExitStack
from typing import Any, Dict, Optional

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.types import Command

from app.agents.graph import build_cortex_graph
from app.services.events import (
    AGENT_HUMAN,
    AGENT_SYSTEM,
    get_event_bus,
)

logger = logging.getLogger("cortexlab.runtime")

TERMINAL_STEPS = {"COMPLETED", "NO_RESULTS", "NO_INCLUDED_STUDIES", "ERROR"}


class GraphRuntime:
    def __init__(self) -> None:
        self.graph = None
        self._stack: Optional[AsyncExitStack] = None
        self._tasks: Dict[str, asyncio.Task] = {}

    async def start(self, db_path: Optional[str]) -> None:
        """``db_path=None`` uses an in-memory checkpointer (tests only)."""
        await self.stop()
        self._stack = AsyncExitStack()
        bus = get_event_bus()
        await bus.start(db_path)
        if db_path:
            saver = await self._stack.enter_async_context(AsyncSqliteSaver.from_conn_string(db_path))
            await saver.conn.execute("PRAGMA journal_mode=WAL")
            await saver.conn.execute("PRAGMA busy_timeout=5000")
        else:
            saver = InMemorySaver()
        self.graph = build_cortex_graph(saver)
        logger.info("Graph runtime started (checkpoints: %s)", db_path or "memory")

    async def stop(self) -> None:
        for task in list(self._tasks.values()):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        self._tasks.clear()
        if self._stack is not None:
            await self._stack.aclose()
            self._stack = None
        await get_event_bus().stop()
        self.graph = None

    @staticmethod
    def config(thread_id: str) -> Dict[str, Any]:
        return {"configurable": {"thread_id": thread_id}}

    def is_running(self, thread_id: str) -> bool:
        task = self._tasks.get(thread_id)
        return bool(task and not task.done())

    def launch(self, thread_id: str, graph_input: Any) -> None:
        """Starts (or resumes, when ``graph_input`` is a Command / None) a run without blocking."""
        if self.is_running(thread_id):
            raise RuntimeError("run already in progress")
        self._tasks[thread_id] = asyncio.create_task(self._drive(thread_id, graph_input))

    async def _drive(self, thread_id: str, graph_input: Any) -> None:
        bus = get_event_bus()
        config = self.config(thread_id)
        try:
            async for _ in self.graph.astream(graph_input, config, stream_mode="updates"):
                pass
            snapshot = await self.graph.aget_state(config)
            interrupts = [i for task in snapshot.tasks for i in task.interrupts]
            if interrupts:
                payload = interrupts[0].value
                checkpoint = payload.get("checkpoint")
                await bus.emit(
                    thread_id, AGENT_HUMAN, "run_paused",
                    f"Aguardando decisão do pesquisador ({checkpoint})",
                    status="WAITING_HUMAN", checkpoint=checkpoint,
                )
            else:
                step = (snapshot.values or {}).get("current_step")
                await bus.emit(
                    thread_id, AGENT_SYSTEM, "run_completed" if step != "ERROR" else "run_error",
                    (snapshot.values or {}).get("status_message") or "Execução encerrada",
                    status=step, final_step=step,
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Run %s failed", thread_id)
            await bus.emit(thread_id, AGENT_SYSTEM, "run_error", f"Falha na execução: {type(exc).__name__}: {exc}",
                           status="ERROR", error=str(exc)[:500])
        finally:
            self._tasks.pop(thread_id, None)

    async def snapshot(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Persisted state of a run, or ``None`` if the thread is unknown."""
        snap = await self.graph.aget_state(self.config(thread_id))
        interrupts = [i for task in snap.tasks for i in task.interrupts]
        values = dict(snap.values or {})
        running = self.is_running(thread_id)
        if not values and not running and not snap.next:
            return None

        hitl = None
        if running:
            status = "RUNNING"
        elif interrupts:
            status = "AWAITING_HUMAN"
            hitl = interrupts[0].value
        elif snap.next:
            status = "ERROR"  # stopped mid-run (crash/restart); POST /retry continues from the checkpoint
        else:
            status = "COMPLETED"

        events = await get_event_bus().history(thread_id)
        return {
            "review_id": thread_id,
            "status": status,
            "hitl": hitl,
            "last_event_seq": events[-1]["seq"] if events else 0,
            **values,
        }


runtime = GraphRuntime()


def resume_command(payload: Dict[str, Any]) -> Command:
    return Command(resume=payload)
