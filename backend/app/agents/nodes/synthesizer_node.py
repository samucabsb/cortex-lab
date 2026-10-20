import json
import logging
import re
from typing import Any, Dict, List, Optional
from langchain_core.runnables import RunnableConfig
from app.agents.state import LabGraphState
from app.core.key_vault import get_keys
from app.core.llm_provider import MultiProviderLLMManager
from app.models.evidence import NEEDS_REVIEW, NOT_FOUND, quote_in_text
from app.prompts import load_prompt
from app.services.events import AGENT_SYNTHESIZER, emit_event, thread_id_from_config

logger = logging.getLogger("cortexlab.agents.synthesizer")


def _citation_key(authors: List[str], year: Optional[int], source_api: Optional[str], used: set) -> str:
    """Unique BibTeX-safe key. Without authors we use 'Anon', never a fabricated author name.

    Europe PMC lists 'Surname AB'; OpenAlex lists 'Given Surname'.
    """
    surname = "Anon"
    if authors:
        tokens = authors[0].replace(",", " ").split()
        if tokens:
            pick = tokens[0] if (source_api == "Europe PMC" or "," in authors[0]) else tokens[-1]
            surname = re.sub(r"[^A-Za-z]", "", pick) or "Anon"
    base = f"{surname}{year or 'nd'}"
    key, suffix = base, ord("a")
    while key in used:
        key = f"{base}{chr(suffix)}"
        suffix += 1
    used.add(key)
    return key


def _cell(evidence: Dict[str, Any]) -> str:
    """Flat string for CSV/table cells: the grounded value, or the explicit marker."""
    return evidence["value"]



def _outcomes_cell(item: Dict[str, Any]) -> str:
    if item["outcome"]["status"] == "found":
        return item["outcome"]["value"]
    if item["p_values"]:
        return "p-valores no abstract: " + "; ".join(p["value"] for p in item["p_values"])
    return NEEDS_REVIEW


def _first_quote(item: Dict[str, Any]) -> str:
    candidates = [item["sample_size"], item["outcome"], *item["p_values"], item["comparator"]]
    for ev in candidates:
        if ev.get("quote"):
            return ev["quote"]
    return NOT_FOUND


async def _grounded_gaps(
    matrix_rows: List[Dict[str, Any]],
    abstracts_by_id: Dict[str, str],
    topic: str,
    llm_manager: MultiProviderLLMManager,
    system_prompt: str,
    config: Optional[RunnableConfig],
) -> List[Dict[str, Any]]:
    corpus = [
        {"paper_id": r["paper_id"], "doi": r["doi"], "title": r["title"],
         "abstract": abstracts_by_id.get(r["paper_id"], "")[:1500]}
        for r in matrix_rows if abstracts_by_id.get(r["paper_id"])
    ]
    if len(corpus) < 2:
        return []

    prompt = (
        f"Com base SOMENTE nos abstracts abaixo (tema: '{topic}'), identifique até 3 lacunas de conhecimento.\n"
        "REGRAS: cada lacuna deve citar ao menos um trecho LITERAL (campo 'quote') de um dos abstracts, com o "
        "'paper_id' correspondente. Lacunas sem citação literal serão descartadas.\n"
        f"Abstracts: {json.dumps(corpus, ensure_ascii=False)}\n\n"
        "Retorne EXCLUSIVAMENTE um array JSON; cada elemento:\n"
        '{"title": "...", "domain": "...", "description": "...", "unanswered_question": "...", '
        '"suggested_hypothesis": "...", "supporting": [{"paper_id": "...", "quote": "..."}]}'
    )
    await emit_event(config, AGENT_SYNTHESIZER, "llm_call_started",
                     "Procurando Knowledge Gaps ancorados em citações", source="LLM", papers=len(corpus))
    result = await llm_manager.invoke_json(prompt=prompt, system_message=system_prompt)
    if not isinstance(result, list):
        await emit_event(config, AGENT_SYNTHESIZER, "llm_call_failed",
                         "IA não retornou JSON utilizável; nenhum Knowledge Gap gerado", source="LLM")
        return []

    doi_by_id = {r["paper_id"]: r["doi"] for r in matrix_rows}
    gaps: List[Dict[str, Any]] = []
    for raw in result:
        if not isinstance(raw, dict) or not raw.get("title"):
            continue
        supporting = []
        for sup in raw.get("supporting") or []:
            pid = str(sup.get("paper_id")) if isinstance(sup, dict) else ""
            quote = str(sup.get("quote") or "") if isinstance(sup, dict) else ""
            if pid in abstracts_by_id and quote_in_text(quote, abstracts_by_id[pid]):
                supporting.append({"paper_id": pid, "doi": doi_by_id.get(pid), "quote": quote})
        if not supporting:
            continue  # ungrounded claim: dropped
        gaps.append({
            "gap_id": f"GAP-{len(gaps) + 1:03d}",
            "title": str(raw["title"]),
            "domain": str(raw.get("domain") or NEEDS_REVIEW),
            "description": str(raw.get("description") or ""),
            "unanswered_question": str(raw.get("unanswered_question") or ""),
            "suggested_hypothesis": str(raw.get("suggested_hypothesis") or ""),
            "supporting": supporting,
            "supporting_dois": [s["doi"] for s in supporting if s["doi"]],
            "origin": "llm_with_verified_quotes",
        })
    await emit_event(config, AGENT_SYNTHESIZER, "llm_call_finished",
                     f"{len(gaps)} Knowledge Gap(s) com citação verificada ({len(result) - len(gaps)} descartado(s))",
                     source="LLM", accepted=len(gaps), discarded=len(result) - len(gaps))
    return gaps


async def synthesizer_node(state: LabGraphState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """Synthesizer: PRISMA matrix with per-cell provenance; Knowledge Gaps only when grounded in quotes."""
    topic = state.get("query") or state.get("topic") or ""
    system_prompt = load_prompt("synthesizer")
    logger.info(f"[Synthesizer Agent] Generating PRISMA 2020 matrix for: {topic}")

    audited = state.get("audited_papers", [])
    await emit_event(config, AGENT_SYNTHESIZER, "node_started",
                     f"Consolidando a matriz PRISMA de {len(audited)} estudos",
                     status="WORKING", papers_total=len(audited))

    used_keys: set = set()
    matrix_rows: List[Dict[str, Any]] = []
    for item in audited:
        evidence = {
            "population_n": item["sample_size"],
            "intervention": item["intervention"],
            "comparator": item["comparator"],
            "outcomes": item["outcome"],
            "p_values": item["p_values"],
            "design_cues": item["design_cues"],
            "risk_of_bias": {
                "value": item["risk_of_bias"],
                "assessed_by": item["risk_assessed_by"],
                "justification": item["risk_justification"],
                "rob2_domains": item["rob2_domains"],
                "note": "Avaliação RoB 2 completa exige o texto integral; só há julgamento quando feito pelo pesquisador.",
            },
        }
        grounded = sum(
            1 for key in ("sample_size", "intervention", "comparator", "outcome") if item[key]["status"] == "found"
        )
        matrix_rows.append({
            "paper_id": item["paper_id"],
            "doi": item["doi"] or "",
            "doi_status": item["doi_status"],
            "citation_key": _citation_key(item["authors"], item["year"], item.get("source_api"), used_keys),
            "title": item["title"],
            "authors": item["authors"],
            "year": item["year"],
            "journal": item["journal"],
            "qualis_capes": NOT_FOUND,  # no real Qualis source integrated; never derived from citations
            "sjr_quartile": NOT_FOUND,
            "population_n": _cell(item["sample_size"]),
            "intervention": _cell(item["intervention"]),
            "comparator": _cell(item["comparator"]),
            "outcomes": _outcomes_cell(item),
            "risk_of_bias": item["risk_of_bias"],
            "statistical_soundness": f"{grounded}/4 campos ancorados no abstract",
            "traceable_quote": _first_quote(item),
            "page_reference": None,
            "evidence": evidence,
        })

    gaps: List[Dict[str, Any]] = []
    gemini_key, groq_key = get_keys(thread_id_from_config(config))
    llm_manager = MultiProviderLLMManager(byok_gemini=gemini_key, byok_groq=groq_key)
    if matrix_rows and llm_manager.has_active_key:
        abstracts = {p["id"]: (p.get("abstract") or "") for p in state.get("screened_papers", [])}
        gaps = await _grounded_gaps(matrix_rows, abstracts, topic, llm_manager, system_prompt, config)
    elif matrix_rows:
        await emit_event(config, AGENT_SYNTHESIZER, "info",
                         "Sem chave de IA: Knowledge Gaps não gerados (exigem IA e citações verificáveis)")

    summary = f"Matriz PRISMA ({len(matrix_rows)} estudos) e {len(gaps)} Knowledge Gap(s) com citação verificada."
    await emit_event(config, AGENT_SYNTHESIZER, "node_finished", summary, status="COMPLETED",
                     matrix_rows=len(matrix_rows), knowledge_gaps=len(gaps))

    return {
        "prisma_matrix": matrix_rows,
        "knowledge_gaps": gaps,
        "current_step": "COMPLETED",
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "status_message": summary,
    }
