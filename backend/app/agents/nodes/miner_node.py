import asyncio
import logging
from typing import Dict, Any, List
import httpx
from app.agents.state import LabGraphState
from app.models.schemas import Paper
from app.services.open_apis import federated_literature_search, clean_doi, validate_doi_with_crossref
from app.prompts import load_prompt

logger = logging.getLogger("cortexlab.agents.miner")


async def miner_node(state: LabGraphState) -> Dict[str, Any]:
    """Miner Agent: Performs federated search across OpenAlex, PubMed & Europe PMC with Crossref DOI verification."""
    topic = state.get("query") or state.get("topic") or "Biomedical Research"
    prompt = load_prompt("miner")
    logger.info(f"[Miner Agent] Literature mining for: {topic} (prompt size: {len(prompt)})")

    # Use first boolean query or raw query
    search_query = state.get("boolean_queries", [topic])[0] if state.get("boolean_queries") else topic
    max_p = state.get("max_papers") or 20
    limit_per_source = max(4, min(max_p // 2, 12))
    papers: List[Paper] = await federated_literature_search(search_query, limit_per_source=limit_per_source)

    # Deduplicate strictly by DOI
    seen_dois = set()
    deduped_papers: List[Dict[str, Any]] = []

    for p in papers:
        doi_norm = clean_doi(p.doi) if p.doi else None
        if doi_norm and doi_norm in seen_dois:
            continue
        if doi_norm:
            seen_dois.add(doi_norm)

        paper_dict = p.model_dump()
        paper_dict["doi"] = doi_norm or paper_dict.get("doi")
        deduped_papers.append(paper_dict)

    # Cryptographic/official validation of DOIs via Crossref
    try:
        async with httpx.AsyncClient() as client:
            val_tasks = [
                validate_doi_with_crossref(p["doi"], client=client) if p.get("doi") else asyncio.sleep(0, result=False)
                for p in deduped_papers
            ]
            if val_tasks:
                results = await asyncio.gather(*val_tasks, return_exceptions=True)
                for p, is_valid in zip(deduped_papers, results):
                    p["doi_verified"] = bool(is_valid) if not isinstance(is_valid, Exception) else False
    except Exception as e:
        logger.warning(f"[Miner Agent] Crossref verification batch failed: {e}")

    current_statuses = dict(state.get("agent_statuses") or {})
    current_statuses["miner"] = "WAITING_APPROVAL"

    verified_count = sum(1 for p in deduped_papers if p.get("doi_verified"))
    status_msg = (
        f"MinerAgent recuperou e deduplicou {len(deduped_papers)} artigos ({verified_count} com DOI validado na Crossref). "
        "Aguardando triagem humana."
    )

    return {
        "raw_papers": deduped_papers,
        "active_agent": "miner",
        "current_bench": "bench_mining",
        "agent_statuses": current_statuses,
        "current_step": "SCREENING_CHECKPOINT",
        "hitl_pending": True,
        "hitl_checkpoint": "screening",
        "status_message": status_msg,
    }


def human_screening_node(state: LabGraphState) -> Dict[str, Any]:
    """HITL Screening Gate: Researcher accepts or excludes mined papers."""
    logger.info("[HITL Gate] Processing human screening decisions.")
    screened = [p for p in state.get("raw_papers", []) if p.get("is_screened_in", True)]

    current_statuses = dict(state.get("agent_statuses") or {})
    current_statuses["miner"] = "COMPLETED"
    current_statuses["methodologist"] = "WORKING"

    return {
        "screened_papers": screened,
        "active_agent": "methodologist",
        "current_bench": "bench_auditing",
        "agent_statuses": current_statuses,
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "current_step": "AUDITING",
        "status_message": f"Triagem humana aprovada com {len(screened)} artigos incluídos para auditoria metodológica.",
    }
