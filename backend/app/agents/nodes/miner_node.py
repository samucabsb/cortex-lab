import asyncio
import logging
from typing import Any, Dict, List, Optional
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt
from app.agents.state import LabGraphState
from app.services.events import AGENT_SEARCHER, AGENT_VALIDATOR, emit_event
from app.services.open_apis import clean_doi, federated_literature_search, verify_doi_crossref
from app.prompts import load_prompt

logger = logging.getLogger("cortexlab.agents.miner")

CROSSREF_CONCURRENCY = 6


async def miner_node(state: LabGraphState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """Miner: federated search (OpenAlex + Europe PMC) then Crossref DOI verification, with live telemetry."""
    topic = state.get("query") or state.get("topic") or ""
    prompt = load_prompt("miner")
    queries = state.get("boolean_queries") or []
    search_query = queries[0] if queries else topic
    logger.info(f"[Miner Agent] Literature mining for: {search_query} (prompt size: {len(prompt)})")

    max_p = state.get("max_papers") or 20
    limit_per_source = max(4, min(max_p, 25))

    async def on_search_event(kind: str, source: str, message: str, **data: Any) -> None:
        await emit_event(config, AGENT_SEARCHER, kind, message, source=source, **data)

    await emit_event(config, AGENT_SEARCHER, "node_started", "Minerador iniciando busca federada",
                     status="WORKING", query=search_query)

    papers = await federated_literature_search(
        search_query,
        limit_per_source=limit_per_source,
        year_start=state.get("year_start"),
        year_end=state.get("year_end"),
        on_event=on_search_event,
    )

    # Deduplicate strictly by DOI, then cap at the requested size
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
    deduped_papers = deduped_papers[:max_p]

    await emit_event(
        config, AGENT_SEARCHER, "counters",
        f"{len(deduped_papers)} artigos únicos após deduplicação",
        status="COMPLETED",
        papers_total=len(deduped_papers),
        with_abstract=sum(1 for p in deduped_papers if p.get("abstract")),
        without_doi=sum(1 for p in deduped_papers if not p.get("doi")),
    )

    if not deduped_papers:
        await emit_event(config, AGENT_SEARCHER, "node_finished",
                         "Nenhum artigo retornado pelas bases. Revise a query booleana.", status="COMPLETED")
        return {
            "raw_papers": [],
            "current_step": "NO_RESULTS",
            "hitl_pending": False,
            "hitl_checkpoint": None,
            "status_message": "Nenhum artigo encontrado. Ajuste a query booleana e inicie uma nova revisão.",
        }

    # Official verification of DOIs via Crossref (existence AND title match)
    await emit_event(config, AGENT_VALIDATOR, "node_started", "Validador conferindo DOIs na Crossref",
                     status="WORKING", papers_total=len(deduped_papers))
    semaphore = asyncio.Semaphore(CROSSREF_CONCURRENCY)
    counters = {"checked": 0, "verified": 0}

    async def check(paper: Dict[str, Any]) -> None:
        doi = paper.get("doi")
        if not doi:
            paper["doi_status"], paper["doi_verified"] = "no_doi", False
            await emit_event(config, AGENT_VALIDATOR, "doi_check",
                             "Artigo sem DOI nos metadados da fonte", source="Crossref",
                             paper_id=paper["id"], doi_status="no_doi")
            return
        async with semaphore:
            result = await verify_doi_crossref(doi, expected_title=paper.get("title"))
        status = result["status"]
        paper["doi_status"], paper["doi_verified"] = status, status == "verified"
        counters["checked"] += 1
        counters["verified"] += int(status == "verified")
        await emit_event(
            config, AGENT_VALIDATOR, "doi_check", f"DOI {doi}: {status}", source="Crossref",
            status=status.upper(), paper_id=paper["id"], doi=doi, doi_status=status,
            http_status=result.get("http_status"), elapsed_ms=result.get("elapsed_ms"),
            similarity=result.get("similarity"), crossref_title=result.get("crossref_title"),
            checked=counters["checked"], verified=counters["verified"], papers_total=len(deduped_papers),
        )

    await asyncio.gather(*(check(p) for p in deduped_papers))

    verified_count = sum(1 for p in deduped_papers if p.get("doi_verified"))
    await emit_event(
        config, AGENT_VALIDATOR, "node_finished",
        f"{verified_count}/{len(deduped_papers)} DOIs confirmados na Crossref (existência + título)",
        status="COMPLETED", verified=verified_count, papers_total=len(deduped_papers),
    )

    return {
        "raw_papers": deduped_papers,
        "current_step": "SCREENING_CHECKPOINT",
        "hitl_pending": True,
        "hitl_checkpoint": "screening",
        "status_message": (
            f"{len(deduped_papers)} artigos recuperados ({verified_count} com DOI confirmado na Crossref). "
            "Aguardando a triagem do pesquisador."
        ),
    }


def human_screening_node(state: LabGraphState) -> Dict[str, Any]:
    """HITL Screening Gate: the graph pauses here (persisted checkpoint) until the researcher decides.

    On resume LangGraph re-runs this node from the top, so it only reads the decision and applies it.
    """
    raw_papers = state.get("raw_papers", [])
    decision = interrupt({
        "checkpoint": "screening",
        "message": "Triagem humana: inclua ou exclua cada artigo (exclusão exige justificativa).",
        "paper_ids": [p["id"] for p in raw_papers],
    })

    decided = {d["paper_id"]: d for d in (decision or {}).get("decisions", [])}
    screened: List[Dict[str, Any]] = []
    log: List[Dict[str, Any]] = []
    for paper in raw_papers:
        entry = decided.get(paper["id"])
        verdict = entry["decision"] if entry else "undecided"
        log.append({
            "paper_id": paper["id"],
            "doi": paper.get("doi"),
            "decision": verdict,
            "reason": (entry or {}).get("reason"),
            "decided_by": "human",
        })
        if verdict == "include":
            screened.append(paper)

    return {
        "screened_papers": screened,
        "screening_log": log,
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "current_step": "AUDITING" if screened else "NO_INCLUDED_STUDIES",
        "status_message": (
            f"Triagem humana concluída: {len(screened)} incluídos, {len(raw_papers) - len(screened)} excluídos."
            if screened else "Nenhum artigo incluído na triagem. Revisão encerrada."
        ),
    }
