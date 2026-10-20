import asyncio
import json
import uuid
from typing import Dict
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    CreateReviewRequest,
    HITLDecisionRequest,
)
from app.agents.state import LabGraphState
from app.agents.nodes import (
    pi_coordinator_node,
    miner_node,
    human_screening_node,
    methodologist_node,
    human_bias_node,
    synthesizer_node,
)
from app.services.exporter import ScientificExporter
from app.db.supabase import (
    save_project,
    save_papers,
    save_prisma_matrix,
    log_agent_event,
)

router = APIRouter(prefix="/v1", tags=["CortexLab Core"])

# In-memory store for active research reviews (backed by Supabase in production)
REVIEWS_DATABASE: Dict[str, LabGraphState] = {}


@router.post("/reviews", summary="Inicia nova revisão sistemática com agentes")
async def create_review(payload: CreateReviewRequest):
    review_id = str(uuid.uuid4())[:8]

    initial_state: LabGraphState = {
        "review_id": review_id,
        "query": payload.topic,
        "topic": payload.topic,
        "inclusion_criteria": payload.inclusion_criteria,
        "exclusion_criteria": payload.exclusion_criteria,
        "byok_gemini_key": payload.byok_gemini_key,
        "byok_groq_key": payload.byok_groq_key,
        "active_agent": "coordinator",
        "current_bench": "bench_coordinator",
        "agent_statuses": {
            "coordinator": "WORKING",
            "miner": "IDLE",
            "methodologist": "IDLE",
            "synthesizer": "IDLE",
        },
        "raw_papers": [],
        "screened_papers": [],
        "audited_papers": [],
        "prisma_matrix": [],
        "knowledge_gaps": [],
        "current_step": "PLANNING",
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "status_message": f"PI Coordinator estruturando protocolo metodológico para '{payload.topic}'...",
        "logs": [],
        "errors": [],
    }

    # Step 1: PI Coordinator node (PICO & Boolean Queries)
    coord_result = await pi_coordinator_node(initial_state)
    initial_state.update(coord_result)

    # Step 2: Miner Node (Federated Literature Search & Deduplication)
    miner_result = await miner_node(initial_state)
    initial_state.update(miner_result)

    REVIEWS_DATABASE[review_id] = initial_state

    # Background async persistence to Supabase if configured
    asyncio.create_task(save_project({
        "review_id": review_id,
        "topic": payload.topic,
        "pico_framework": initial_state.get("pico", {}),
        "boolean_queries": initial_state.get("boolean_queries", []),
        "inclusion_criteria": initial_state.get("inclusion_criteria", []),
        "exclusion_criteria": initial_state.get("exclusion_criteria", []),
        "current_step": initial_state.get("current_step"),
        "status": "AWAITING_HUMAN",
    }))
    asyncio.create_task(save_papers(review_id, initial_state.get("raw_papers", [])))
    asyncio.create_task(log_agent_event(
        review_id, "miner", "bench_mining", "SCREENING_CHECKPOINT", "PAPERS_FETCHED",
        {"count": len(initial_state.get("raw_papers", []))}
    ))

    return {
        "review_id": review_id,
        "status": initial_state["current_step"],
        "pico": initial_state.get("pico"),
        "boolean_queries": initial_state.get("boolean_queries"),
        "hitl_pending": initial_state["hitl_pending"],
        "hitl_checkpoint": initial_state["hitl_checkpoint"],
        "message": initial_state["status_message"],
        "papers_found": len(initial_state["raw_papers"]),
        "papers": initial_state["raw_papers"],
    }


@router.get("/reviews/{review_id}", summary="Consulta estado completo da revisão")
async def get_review(review_id: str):
    if review_id not in REVIEWS_DATABASE:
        raise HTTPException(status_code=404, detail="Review session not found")
    return REVIEWS_DATABASE[review_id]


@router.post("/reviews/{review_id}/hitl", summary="Validação humana (Human-in-the-Loop)")
async def submit_hitl_decision(review_id: str, decision: HITLDecisionRequest):
    if review_id not in REVIEWS_DATABASE:
        raise HTTPException(status_code=404, detail="Review session not found")

    state = REVIEWS_DATABASE[review_id]

    if decision.step_checkpoint == "screening":
        rejected_set = set(decision.rejected_paper_ids or [])
        for p in state.get("raw_papers", []):
            p["is_screened_in"] = p["id"] not in rejected_set

        # 1. Human node
        screened_res = human_screening_node(state)
        state.update(screened_res)

        # 2. Methodologist node (Auditing rigor & bias)
        audit_res = await methodologist_node(state)
        state.update(audit_res)

        # 3. Synthesizer node (Always generate PRISMA matrix & Knowledge Gaps for immediate inspection)
        synth_res = await synthesizer_node(state)
        state.update(synth_res)

        REVIEWS_DATABASE[review_id] = state

        # Async save PRISMA rows
        if state.get("prisma_matrix"):
            asyncio.create_task(save_prisma_matrix(review_id, state["prisma_matrix"]))

        return {
            "review_id": review_id,
            "status": state["current_step"],
            "hitl_pending": False,
            "hitl_checkpoint": None,
            "message": state["status_message"],
            "audited_papers": state.get("audited_papers", []),
            "matrix_rows": len(state.get("prisma_matrix", [])),
            "prisma_matrix": state.get("prisma_matrix", []),
            "knowledge_gaps": state.get("knowledge_gaps", []),
        }

    elif decision.step_checkpoint == "bias_arbitration":
        bias_res = human_bias_node(state)
        state.update(bias_res)

        synth_res = await synthesizer_node(state)
        state.update(synth_res)

        REVIEWS_DATABASE[review_id] = state

        if state.get("prisma_matrix"):
            asyncio.create_task(save_prisma_matrix(review_id, state["prisma_matrix"]))

        return {
            "review_id": review_id,
            "status": state["current_step"],
            "hitl_pending": False,
            "message": state["status_message"],
            "matrix_rows": len(state.get("prisma_matrix", [])),
            "prisma_matrix": state.get("prisma_matrix", []),
            "knowledge_gaps": state.get("knowledge_gaps", []),
        }

    raise HTTPException(status_code=400, detail="Invalid checkpoint step")


@router.get("/reviews/{review_id}/events", summary="Stream SSE de telemetria dos agentes")
async def stream_review_events(review_id: str):
    """Server-Sent Events endpoint streaming real-time status of agent benches."""
    async def event_generator():
        for _ in range(15):
            await asyncio.sleep(2)
            state = REVIEWS_DATABASE.get(review_id, {})
            current_step = state.get("current_step", "MINING")

            payload = {
                "review_id": review_id,
                "step": current_step,
                "active_agent": state.get("active_agent", "miner"),
                "current_bench": state.get("current_bench", "bench_mining"),
                "agent_statuses": state.get("agent_statuses", {}),
                "hitl_pending": state.get("hitl_pending", False),
                "papers_count": len(state.get("raw_papers", [])),
                "message": state.get("status_message", "Agentes processando em bancadas..."),
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if current_step == "COMPLETED":
                break

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/reviews/{review_id}/export/csv", summary="Exporta Matriz PRISMA em CSV")
async def export_prisma_csv(review_id: str):
    if review_id not in REVIEWS_DATABASE:
        raise HTTPException(status_code=404, detail="Review session not found")

    state = REVIEWS_DATABASE[review_id]
    matrix = state.get("prisma_matrix", [])
    csv_content = ScientificExporter.export_prisma_matrix_csv(matrix)

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=prisma_matrix_{review_id}.csv"},
    )


@router.get("/reviews/{review_id}/export/bibtex", summary="Exporta Citações em BibTeX")
async def export_bibtex(review_id: str):
    if review_id not in REVIEWS_DATABASE:
        raise HTTPException(status_code=404, detail="Review session not found")

    state = REVIEWS_DATABASE[review_id]
    matrix = state.get("prisma_matrix", [])
    bib_content = ScientificExporter.export_bibtex_references(matrix)

    return Response(
        content=bib_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=references_{review_id}.bib"},
    )
