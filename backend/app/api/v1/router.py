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

DEMO_REVIEW_ID = "demo-cart-cells"


def get_demo_review_state() -> LabGraphState:
    return {
        "review_id": DEMO_REVIEW_ID,
        "query": "Eficácia e toxicidade de células CAR-T em tumores sólidos",
        "topic": "Eficácia e toxicidade de células CAR-T em tumores sólidos",
        "current_step": "SCREENING_CHECKPOINT",
        "hitl_pending": True,
        "hitl_checkpoint": "screening",
        "status_message": "Agentes concluíram a busca inicial. 4 artigos aguardam triagem humana.",
        "pico": {
            "population": "Pacientes adultos com neoplasias sólidas refratárias ou modelos pré-clínicos in-vivo",
            "intervention": "Terapia celular adotiva com linfócitos T modificados (CAR-T Cells de 2ª e 3ª geração)",
            "comparator": "Quimioterapia citotóxica padrão, inibidores de checkpoint imune (anti-PD-1) ou placebo",
            "outcome": "Taxa de resposta objetiva (ORR), sobrevida livre de progressão (PFS) e síndrome de liberação de citocinas (CRS)",
        },
        "boolean_queries": [
            '("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors" OR "neoplasms") AND (randomized OR clinical trial)',
            '("CAR-T cells"[Title/Abstract]) AND ("toxicity" OR "efficacy") AND (control OR comparator)',
            '("Adoptive T-cell therapy") AND ("microenvironment") AND (OpenAlex OR EuropePMC)',
        ],
        "active_agent": "miner",
        "current_bench": "bench_hitl",
        "agent_statuses": {
            "coordinator": "DONE",
            "miner": "DONE",
            "methodologist": "IDLE",
            "synthesizer": "IDLE",
        },
        "raw_papers": [
            {
                "id": "openalex:W43819201",
                "doi": "10.1038/s41591-023-02612-8",
                "title": "Armored CAR-T cells overcome immunosuppressive tumor microenvironment in solid malignancies: a randomized phase II trial",
                "authors": ["Mackall, C. L.", "June, C. H.", "Silva, R. M."],
                "year": 2024,
                "journal": "Nature Medicine",
                "abstract": "Background: Chimeric antigen receptor (CAR) T-cell therapy has shown limited efficacy in solid tumors due to T-cell exhaustion. Methods: We randomized n = 128 patients with refractory solid tumors into armored CAR-T versus standard immunotherapy. Results: Armored CAR-T achieved an objective response rate of 54% (p < 0.001) with manageable grade 1-2 cytokine release syndrome.",
                "source_api": "OpenAlex",
                "doi_verified": True,
                "citation_count": 142,
                "is_screened_in": True,
            },
            {
                "id": "europepmc:PMC1092837",
                "doi": "10.1056/nejmoa2308912",
                "title": "GD2-targeted CAR T cells in high-risk neuroblastoma and solid pediatric sarcomas: long-term follow-up",
                "authors": ["Locatelli, F.", "Quintarelli, C.", "De Angelis, B."],
                "year": 2024,
                "journal": "New England Journal of Medicine",
                "abstract": "Methods: Prospective cohort of 84 patients treated with third-generation GD2-CAR T cells. Primary endpoints were safety and 3-year event-free survival. Results: Complete remission was observed in 63% of subjects (p = 0.004) compared to historical controls.",
                "source_api": "Europe PMC",
                "doi_verified": True,
                "citation_count": 215,
                "is_screened_in": True,
            },
            {
                "id": "openalex:W43901122",
                "doi": "10.1158/2159-8290.cd-23-0411",
                "title": "Preliminary single-arm evaluation of mesothelin-directed CAR-T infusion in pleural mesothelioma",
                "authors": ["Wang, Y.", "Chen, L.", "Oliveira, S."],
                "year": 2023,
                "journal": "Cancer Discovery",
                "abstract": "We evaluated 18 patients in an unblinded pilot study without an active comparator arm. Marginal tumor regression was noted (p = 0.048), though high drop-out rates and absence of power calculation limit generalizability.",
                "source_api": "OpenAlex",
                "doi_verified": True,
                "citation_count": 34,
                "is_screened_in": True,
            },
            {
                "id": "europepmc:PMC1104921",
                "doi": "10.1016/s1470-2045(24)00091-3",
                "title": "Dual-targeting Claudin18.2 and PD-L1 CAR-T therapy in advanced gastric and pancreatic adenocarcinoma",
                "authors": ["Shen, L.", "Qi, C.", "Zhang, X."],
                "year": 2024,
                "journal": "The Lancet Oncology",
                "abstract": "In this multicenter controlled study of 160 participants, dual-targeting CAR-T cells demonstrated superior progression-free survival (median 8.4 months vs 3.9 months, p < 0.001) with blinded independent central review.",
                "source_api": "Europe PMC",
                "doi_verified": True,
                "citation_count": 96,
                "is_screened_in": True,
            },
        ],
        "screened_papers": [],
        "audited_papers": [],
        "prisma_matrix": [],
        "knowledge_gaps": [],
    }


# In-memory store for active research reviews (backed by Supabase in production)
REVIEWS_DATABASE: Dict[str, LabGraphState] = {
    DEMO_REVIEW_ID: get_demo_review_state(),
}


@router.post("/reviews", summary="Inicia nova revisão sistemática com agentes")
async def create_review(payload: CreateReviewRequest):
    review_id = str(uuid.uuid4())

    initial_state: LabGraphState = {
        "review_id": review_id,
        "query": payload.topic,
        "topic": payload.topic,
        "inclusion_criteria": payload.inclusion_criteria,
        "exclusion_criteria": payload.exclusion_criteria,
        "max_papers": payload.max_papers,
        "year_start": payload.year_start,
        "year_end": payload.year_end,
        "require_open_access": payload.require_open_access,
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
    safe_state = dict(REVIEWS_DATABASE[review_id])
    safe_state.pop("byok_gemini_key", None)
    safe_state.pop("byok_groq_key", None)
    return safe_state


@router.post("/reviews/{review_id}/hitl", summary="Validação humana (Human-in-the-Loop)")
async def submit_hitl_decision(review_id: str, decision: HITLDecisionRequest):
    if review_id not in REVIEWS_DATABASE:
        raise HTTPException(status_code=404, detail="Review session not found")

    state = REVIEWS_DATABASE[review_id]

    if decision.step_checkpoint == "screening":
        rejected_set = set(decision.rejected_paper_ids or [])
        for p in state.get("raw_papers", []):
            p["is_screened_in"] = p["id"] not in rejected_set

        # 1. Human screening gate
        screened_res = human_screening_node(state)
        state.update(screened_res)

        # 2. Methodologist node (Auditing rigor & bias)
        audit_res = await methodologist_node(state)
        state.update(audit_res)

        # CHECKPOINT 2: If methodologist flagged high bias requiring arbitration, PAUSE workflow
        if state.get("hitl_pending") and state.get("hitl_checkpoint") == "bias_arbitration":
            REVIEWS_DATABASE[review_id] = state
            return {
                "review_id": review_id,
                "status": state["current_step"],
                "hitl_pending": True,
                "hitl_checkpoint": "bias_arbitration",
                "message": state["status_message"],
                "audited_papers": state.get("audited_papers", []),
                "matrix_rows": 0,
                "prisma_matrix": [],
                "knowledge_gaps": [],
            }

        # 3. Synthesizer node (When no bias arbitration is pending)
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
