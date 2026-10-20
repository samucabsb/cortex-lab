import json
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from app.agents.nodes.pi_coordinator import suggest_protocol
from app.core import key_vault
from app.core.config import settings
from app.models.schemas import (
    CreateReviewRequest,
    HITLDecisionRequest,
    ProtocolSuggestionRequest,
)
from app.services.events import AGENT_HUMAN, AGENT_SYSTEM, TERMINAL_KINDS, get_event_bus
from app.services.exporter import ScientificExporter
from app.services.runtime import resume_command, runtime

router = APIRouter(prefix="/v1", tags=["CortexLab Core"])


def _has_server_llm_key() -> bool:
    return bool(settings.GOOGLE_API_KEY or settings.GROQ_API_KEY)


async def _require_review(review_id: str) -> Dict[str, Any]:
    snapshot = await runtime.snapshot(review_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Review session not found")
    return snapshot


@router.post("/protocol/suggest", summary="Sugere PICO e queries com IA (opcional, exige chave BYOK)")
async def suggest_review_protocol(payload: ProtocolSuggestionRequest):
    if not (payload.byok_gemini_key or payload.byok_groq_key or _has_server_llm_key()):
        raise HTTPException(
            status_code=422,
            detail="A sugestão por IA exige uma chave BYOK (Gemini ou Groq). Sem chave, preencha o PICO manualmente.",
        )
    suggestion = await suggest_protocol(payload.topic, payload.byok_gemini_key, payload.byok_groq_key)
    if suggestion is None:
        raise HTTPException(status_code=502, detail="A IA não retornou um protocolo utilizável. Preencha manualmente.")
    return {**suggestion, "source": "llm", "note": "Rascunho de IA: revise e confirme antes de iniciar."}


@router.post("/reviews", status_code=202, summary="Inicia a revisão: roda o grafo LangGraph em background")
async def create_review(payload: CreateReviewRequest):
    thread_id = str(uuid.uuid4())
    key_vault.set_keys(thread_id, payload.byok_gemini_key, payload.byok_groq_key)

    initial_state = {
        "review_id": thread_id,
        "query": payload.topic,
        "topic": payload.topic,
        "pico": payload.pico.model_dump(),
        "boolean_queries": payload.boolean_queries,
        "ai_assisted": payload.ai_assisted,
        "inclusion_criteria": payload.inclusion_criteria,
        "exclusion_criteria": payload.exclusion_criteria,
        "max_papers": payload.max_papers,
        "year_start": payload.year_start,
        "year_end": payload.year_end,
        "current_step": "PLANNING",
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "status_message": "Execução iniciada.",
        "errors": [],
    }
    await get_event_bus().emit(thread_id, AGENT_SYSTEM, "run_started", "Execução do grafo iniciada",
                               status="RUNNING", topic=payload.topic)
    runtime.launch(thread_id, initial_state)
    return {
        "review_id": thread_id,
        "thread_id": thread_id,
        "status": "RUNNING",
        "events_url": f"/api/v1/reviews/{thread_id}/events",
    }


@router.get("/reviews/{review_id}", summary="Estado persistido da revisão (checkpoint do grafo)")
async def get_review(review_id: str):
    return await _require_review(review_id)


def _validate_resume(decision: HITLDecisionRequest, pending: Dict[str, Any]) -> Dict[str, Any]:
    """Checks the researcher's decision against what the graph is actually waiting for."""
    checkpoint = pending.get("checkpoint")
    if decision.step_checkpoint != checkpoint:
        raise HTTPException(status_code=409, detail=f"A revisão aguarda o checkpoint '{checkpoint}'.")

    if checkpoint == "screening":
        expected = set(pending["paper_ids"])
        decisions = decision.screening or []
        got = [d.paper_id for d in decisions]
        unknown, undecided = set(got) - expected, expected - set(got)
        if unknown or undecided or len(got) != len(set(got)):
            raise HTTPException(status_code=422, detail={
                "message": "Cada artigo deve receber exatamente uma decisão (incluir/excluir).",
                "unknown_ids": sorted(unknown),
                "undecided_ids": sorted(undecided),
            })
        return {"decisions": [d.model_dump() for d in decisions], "notes": decision.notes}

    expected = {f["paper_id"] for f in pending["flagged"]}
    decisions = decision.bias or []
    got = [d.paper_id for d in decisions]
    unknown, undecided = set(got) - expected, expected - set(got)
    if unknown or undecided or len(got) != len(set(got)):
        raise HTTPException(status_code=422, detail={
            "message": "Cada estudo sinalizado deve receber um julgamento justificado.",
            "unknown_ids": sorted(unknown),
            "undecided_ids": sorted(undecided),
        })
    return {"decisions": [d.model_dump() for d in decisions], "notes": decision.notes}


@router.post("/reviews/{review_id}/hitl", status_code=202, summary="Retoma o grafo com a decisão humana (HITL)")
async def submit_hitl_decision(review_id: str, decision: HITLDecisionRequest):
    snapshot = await _require_review(review_id)
    if snapshot["status"] != "AWAITING_HUMAN":
        raise HTTPException(status_code=409, detail=f"A revisão não está aguardando decisão humana (status: {snapshot['status']}).")

    payload = _validate_resume(decision, snapshot["hitl"])
    key_vault.set_keys(review_id, decision.byok_gemini_key, decision.byok_groq_key)

    await get_event_bus().emit(
        review_id, AGENT_HUMAN, "human_decision",
        f"Pesquisador decidiu no checkpoint '{decision.step_checkpoint}' ({len(payload['decisions'])} decisões)",
        status="RESUMING", checkpoint=decision.step_checkpoint, decisions=len(payload["decisions"]),
    )
    try:
        runtime.launch(review_id, resume_command(payload))
    except RuntimeError:
        raise HTTPException(status_code=409, detail="Execução já em andamento.")
    return {"review_id": review_id, "status": "RUNNING"}


@router.post("/reviews/{review_id}/retry", status_code=202, summary="Continua uma execução interrompida a partir do checkpoint")
async def retry_review(review_id: str):
    snapshot = await _require_review(review_id)
    if snapshot["status"] != "ERROR":
        raise HTTPException(status_code=409, detail=f"Nada a continuar (status: {snapshot['status']}).")
    await get_event_bus().emit(review_id, AGENT_SYSTEM, "run_started", "Retomando a partir do último checkpoint",
                               status="RUNNING")
    runtime.launch(review_id, None)
    return {"review_id": review_id, "status": "RUNNING"}


@router.get("/reviews/{review_id}/events", summary="Stream SSE de telemetria real dos agentes")
async def stream_review_events(
    review_id: str,
    request: Request,
    after: Optional[int] = Query(default=None, ge=0, description="Reenvia eventos com seq > after"),
    follow: bool = Query(default=True, description="false: devolve o histórico e encerra"),
    last_event_id: Optional[str] = Header(default=None),
):
    """Server-Sent Events. Reconnecting clients resume via the standard Last-Event-ID header."""
    await _require_review(review_id)
    cursor = after if after is not None else (int(last_event_id) if (last_event_id or "").isdigit() else 0)
    bus = get_event_bus()

    def frame(event: Dict[str, Any]) -> str:
        return f"id: {event['seq']}\nevent: agent_event\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"

    async def event_generator():
        if not follow:
            for event in await bus.history(review_id, cursor):
                yield frame(event)
            return
        async for event in bus.stream(review_id, after=cursor):
            if await request.is_disconnected():
                return
            if event is None:
                yield ": heartbeat\n\n"
                continue
            yield frame(event)
            if event["kind"] in TERMINAL_KINDS:
                return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _completed_matrix(review_id: str):
    snapshot = await _require_review(review_id)
    if snapshot["status"] != "COMPLETED" or not snapshot.get("prisma_matrix"):
        raise HTTPException(status_code=409, detail="A matriz PRISMA ainda não está disponível para exportação.")
    return snapshot["prisma_matrix"]


@router.get("/reviews/{review_id}/export/csv", summary="Exporta Matriz PRISMA em CSV")
async def export_prisma_csv(review_id: str):
    matrix = await _completed_matrix(review_id)
    return Response(
        content=ScientificExporter.export_prisma_matrix_csv(matrix),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=prisma_matrix_{review_id}.csv"},
    )


@router.get("/reviews/{review_id}/export/bibtex", summary="Exporta Citações em BibTeX")
async def export_bibtex(review_id: str):
    matrix = await _completed_matrix(review_id)
    return Response(
        content=ScientificExporter.export_bibtex_references(matrix),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=references_{review_id}.bib"},
    )
