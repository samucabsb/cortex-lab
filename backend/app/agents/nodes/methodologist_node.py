import json
import logging
import re
from typing import Any, Dict, List, Optional
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt
from app.agents.state import LabGraphState
from app.core.key_vault import get_keys
from app.core.llm_provider import MultiProviderLLMManager
from app.models.evidence import (
    NEEDS_REVIEW,
    found,
    needs_review,
    not_found,
    numbers_supported_by_quote,
    quote_in_text,
    sentence_around,
)
from app.prompts import load_prompt
from app.services.events import (
    AGENT_BIAS_AUDITOR,
    AGENT_EXTRACTOR,
    emit_event,
    thread_id_from_config,
)

logger = logging.getLogger("cortexlab.agents.methodologist")

ROB2_DOMAINS = (
    "randomization_process",
    "deviations_from_intended_interventions",
    "missing_outcome_data",
    "outcome_measurement",
    "selection_of_reported_result",
)

_PARTICIPANT_WORDS = (
    r"patients|participants|subjects|individuals|children|adolescents|women|men|volunteers|"
    r"pacientes|participantes|sujeitos|indivíduos|voluntários"
)
SAMPLE_SIZE_PATTERNS = [
    re.compile(r"\b[nN]\s*=\s*(\d{1,3}(?:,\d{3})+|\d+)"),
    re.compile(
        r"\b(\d{1,3}(?:,\d{3})+|\d+)\s+"
        r"(?:(?:adult|pediatric|paediatric|eligible|enrolled|randomi[sz]ed|consecutive|human|healthy)\s+){0,2}"
        rf"(?:{_PARTICIPANT_WORDS})\b",
        re.IGNORECASE,
    ),
]
P_VALUE_PATTERN = re.compile(r"\b[pP]\s*(?:<|=|>|≤|≥)\s*0?\.\d+(?:[eE]-?\d+)?")
COMPARATOR_PATTERN = re.compile(
    r"\bplacebo\b|\bcontrol (?:group|arm)s?\b|\bcomparator\b|\bstandard (?:of care|therapy|treatment)\b|"
    r"\bversus\b|\bvs\.?\s|\bcompared (?:with|to)\b|\bgrupo (?:controle|comparador)\b|\bcomparado (?:com|a)\b",
    re.IGNORECASE,
)

# (cue, regex, raises_bias_attention). Cues with True ask the researcher to arbitrate; they are
# NOT a Cochrane RoB 2 judgement (RoB 2 needs the full text, domain by domain).
DESIGN_CUES = [
    ("single_arm", re.compile(r"single[- ]arm|one[- ]arm|\bbraço único\b|\buncontrolled\b", re.I), True),
    ("unblinded", re.compile(r"\bunblinded\b|open[- ]label|\bnão cego\b|\bsem cegamento\b", re.I), True),
    ("pilot", re.compile(r"\bpilot (?:study|trial|cohort)\b|\bestudo piloto\b", re.I), True),
    (
        "no_control",
        re.compile(
            r"without (?:a |an )?(?:active )?(?:comparator|control)(?: group| arm)?|"
            r"\bno (?:control|comparator) (?:group|arm)\b|absence of (?:a )?(?:control|comparator)|"
            r"\bsem (?:grupo )?(?:controle|comparador)\b",
            re.I,
        ),
        True,
    ),
    ("randomized", re.compile(r"randomi[sz]ed|\brandomizado\b", re.I), False),
    ("double_blind", re.compile(r"double[- ]blind|\bduplo[- ]cego\b", re.I), False),
    ("placebo_controlled", re.compile(r"placebo", re.I), False),
]


def _extract_sample_size(abstract: str, doi: Optional[str]) -> Dict[str, Any]:
    candidates: Dict[int, str] = {}  # N -> sentence
    for pattern in SAMPLE_SIZE_PATTERNS:
        for match in pattern.finditer(abstract):
            n = int(match.group(1).replace(",", ""))
            candidates.setdefault(n, sentence_around(abstract, match.start(), match.end()))
    if not candidates:
        return not_found("Nenhum tamanho amostral explícito no abstract", doi=doi)
    if len(candidates) > 1:
        listed = ", ".join(str(n) for n in sorted(candidates))
        first_quote = next(iter(candidates.values()))
        return needs_review(f"Múltiplos valores de N no abstract ({listed}); confirme o N total",
                            doi=doi, quote=first_quote)
    n, quote = next(iter(candidates.items()))
    return found(f"N = {n}", quote, doi=doi)


def _extract_p_values(abstract: str, doi: Optional[str]) -> List[Dict[str, Any]]:
    values: List[Dict[str, Any]] = []
    seen = set()
    for match in P_VALUE_PATTERN.finditer(abstract):
        text = re.sub(r"\s+", " ", match.group(0))
        if text in seen:
            continue
        seen.add(text)
        values.append(found(text, sentence_around(abstract, match.start(), match.end()), doi=doi))
        if len(values) == 5:
            break
    return values


def _extract_design_cues(abstract: str, doi: Optional[str]) -> List[Dict[str, Any]]:
    cues = []
    for name, pattern, _ in DESIGN_CUES:
        match = pattern.search(abstract)
        if match:
            cues.append(found(name, sentence_around(abstract, match.start(), match.end()), doi=doi))
    return cues


def _extract_comparator(abstract: str, cues: List[Dict[str, Any]], doi: Optional[str]) -> Dict[str, Any]:
    has_no_control_cue = any(c["value"] in ("single_arm", "no_control") for c in cues)
    negation = next(p for name, p, _ in DESIGN_CUES if name == "no_control")
    negated_spans = [m.span() for m in negation.finditer(abstract)]
    match = next(
        (m for m in COMPARATOR_PATTERN.finditer(abstract)
         if not any(s <= m.start() and m.end() <= e for s, e in negated_spans)),
        None,
    )
    if match and has_no_control_cue:
        return needs_review("O abstract menciona comparador e também sugere ausência de controle",
                            doi=doi, quote=sentence_around(abstract, match.start(), match.end()))
    if match:
        sentence = sentence_around(abstract, match.start(), match.end())
        return found(sentence, sentence, doi=doi)
    note = "Abstract sugere ausência de grupo comparador" if has_no_control_cue else "Comparador não descrito no abstract"
    return not_found(note, doi=doi)



def _audit_paper_from_abstract(paper: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """Deterministic extraction. Every value is anchored to a verbatim sentence of the abstract.

    Missing evidence is marked ``not_found`` / ``needs_human_review``; nothing is fabricated.
    """
    abstract = (paper.get("abstract") or "").strip()
    doi = paper.get("doi") or None
    flagged_cues: List[str] = []

    if abstract:
        sample_size = _extract_sample_size(abstract, doi)
        p_values = _extract_p_values(abstract, doi)
        cues = _extract_design_cues(abstract, doi)
        comparator = _extract_comparator(abstract, cues, doi)
        attention = {name for name, _, raises in DESIGN_CUES if raises}
        flagged_cues = [c["value"] for c in cues if c["value"] in attention]
    else:
        note = "Abstract indisponível na fonte; requer leitura do texto completo"
        sample_size, comparator = not_found(note, doi=doi), not_found(note, doi=doi)
        p_values, cues = [], []

    return {
        "paper_id": paper.get("id", f"paper_{idx + 1}"),
        "doi": doi,
        "doi_status": paper.get("doi_status", "unchecked"),
        "title": paper.get("title") or NEEDS_REVIEW,
        "authors": paper.get("authors") or [],
        "year": paper.get("year"),
        "journal": paper.get("journal"),
        "source_api": paper.get("source_api"),
        "abstract_available": bool(abstract),
        "sample_size": sample_size,
        "comparator": comparator,
        "intervention": needs_review("Não extraído automaticamente do abstract", doi=doi),
        "outcome": needs_review("Não extraído automaticamente do abstract", doi=doi),
        "p_values": p_values,
        "design_cues": cues,
        "rob2_domains": {d: NEEDS_REVIEW for d in ROB2_DOMAINS},
        "needs_bias_arbitration": bool(flagged_cues),
        "bias_attention_cues": flagged_cues,
        "risk_of_bias": NEEDS_REVIEW,
        "risk_assessed_by": None,
        "risk_justification": None,
    }


def _ground_llm_field(field: Any, abstract: str, doi: Optional[str], numeric: bool = False) -> Optional[Dict[str, Any]]:
    """Accepts an LLM-proposed {value, quote} only if the quote is verbatim in the abstract
    (and, for numeric fields, every number in the value appears in that quote)."""
    if not isinstance(field, dict):
        return None
    value, quote = str(field.get("value") or "").strip(), str(field.get("quote") or "").strip()
    if not value or not quote_in_text(quote, abstract):
        return None
    if numeric and not numbers_supported_by_quote(value, quote):
        return None
    return found(value, quote, doi=doi, method="llm_verified")


async def _enrich_with_llm(
    audited: List[Dict[str, Any]],
    screened: List[Dict[str, Any]],
    llm_manager: MultiProviderLLMManager,
    system_prompt: str,
    config: Optional[RunnableConfig],
) -> None:
    abstracts = {p.get("id"): (p.get("abstract") or "") for p in screened}
    candidates = [a for a in audited if a["abstract_available"]]
    batch_size = 5
    accepted = rejected = 0

    for start in range(0, len(candidates), batch_size):
        batch = candidates[start:start + batch_size]
        payload = [
            {"paper_id": a["paper_id"], "title": a["title"], "abstract": abstracts.get(a["paper_id"], "")[:2500]}
            for a in batch
        ]
        prompt = (
            "Extraia dados de cada abstract abaixo. REGRAS: o campo 'quote' deve ser copiado LITERALMENTE do "
            "abstract; se a informação não estiver no abstract, use null no campo. Não infira nem invente.\n"
            f"Artigos: {json.dumps(payload, ensure_ascii=False)}\n\n"
            "Retorne EXCLUSIVAMENTE um array JSON; cada elemento:\n"
            '{"paper_id": "...", "sample_size": {"value": "N = ...", "quote": "..."} | null, '
            '"comparator": {"value": "...", "quote": "..."} | null, '
            '"intervention": {"value": "...", "quote": "..."} | null, '
            '"outcome": {"value": "...", "quote": "..."} | null}'
        )
        await emit_event(config, AGENT_EXTRACTOR, "llm_call_started",
                         f"Extração assistida por IA (lote {start // batch_size + 1})", source="LLM",
                         papers=len(batch))
        result = await llm_manager.invoke_json(prompt=prompt, system_message=system_prompt)
        if not isinstance(result, list):
            await emit_event(config, AGENT_EXTRACTOR, "llm_call_failed",
                             "IA não retornou JSON utilizável; mantida a extração determinística", source="LLM")
            continue

        by_id = {str(e.get("paper_id")): e for e in result if isinstance(e, dict)}
        for item in batch:
            entry = by_id.get(str(item["paper_id"]))
            abstract = abstracts.get(item["paper_id"], "")
            if not entry:
                continue
            for src_key, dst_key, numeric in (
                ("sample_size", "sample_size", True),
                ("comparator", "comparator", False),
                ("intervention", "intervention", False),
                ("outcome", "outcome", False),
            ):
                if entry.get(src_key) is None:
                    continue
                grounded = _ground_llm_field(entry[src_key], abstract, item["doi"], numeric=numeric)
                if grounded:
                    item[dst_key] = grounded
                    accepted += 1
                else:
                    rejected += 1
        await emit_event(config, AGENT_EXTRACTOR, "llm_call_finished",
                         f"IA: {accepted} campos aceitos com citação verificada, {rejected} descartados",
                         source="LLM", accepted=accepted, rejected=rejected)


async def methodologist_node(state: LabGraphState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """Methodologist: grounded extraction (Fitz) and preliminary bias signals (Cochrane)."""
    system_prompt = load_prompt("methodologist")
    screened_papers = state.get("screened_papers", [])
    logger.info(f"[Methodologist Agent] Commencing audit of {len(screened_papers)} papers.")

    await emit_event(config, AGENT_EXTRACTOR, "node_started",
                     f"Extração ancorada no abstract de {len(screened_papers)} artigos",
                     status="WORKING", papers_total=len(screened_papers))

    audited: List[Dict[str, Any]] = []
    for idx, paper in enumerate(screened_papers):
        item = _audit_paper_from_abstract(paper, idx)
        audited.append(item)
        await emit_event(
            config, AGENT_EXTRACTOR, "paper_extracted",
            f"{item['title'][:80]}: N {item['sample_size']['status']}, {len(item['p_values'])} p-valor(es)",
            paper_id=item["paper_id"], doi=item["doi"], sample_size=item["sample_size"]["status"],
            p_values=len(item["p_values"]), comparator=item["comparator"]["status"],
            processed=idx + 1, papers_total=len(screened_papers),
        )

    gemini_key, groq_key = get_keys(thread_id_from_config(config))
    llm_manager = MultiProviderLLMManager(byok_gemini=gemini_key, byok_groq=groq_key)
    if llm_manager.has_active_key and audited:
        await _enrich_with_llm(audited, screened_papers, llm_manager, system_prompt, config)
    else:
        await emit_event(config, AGENT_EXTRACTOR, "info",
                         "Sem chave de IA: apenas extração determinística (intervenção e desfecho ficam em needs_human_review)")

    await emit_event(config, AGENT_EXTRACTOR, "node_finished", "Extração concluída", status="COMPLETED")

    await emit_event(config, AGENT_BIAS_AUDITOR, "node_started",
                     "Procurando sinais metodológicos no abstract (triagem prévia, não é RoB 2 completo)",
                     status="WORKING")
    flagged = [a for a in audited if a["needs_bias_arbitration"]]
    for item in flagged:
        await emit_event(config, AGENT_BIAS_AUDITOR, "bias_signal",
                         f"Sinais que exigem arbitragem: {', '.join(item['bias_attention_cues'])}",
                         paper_id=item["paper_id"], doi=item["doi"], cues=item["bias_attention_cues"])

    if flagged:
        await emit_event(config, AGENT_BIAS_AUDITOR, "node_finished",
                         f"{len(flagged)} artigo(s) aguardam arbitragem de viés pelo pesquisador",
                         status="WAITING_HUMAN", flagged=len(flagged))
        return {
            "audited_papers": audited,
            "current_step": "BIAS_ARBITRATION_CHECKPOINT",
            "hitl_pending": True,
            "hitl_checkpoint": "bias_arbitration",
            "status_message": (
                f"{len(flagged)} estudo(s) com sinais metodológicos de atenção (ex.: braço único, aberto, piloto). "
                "Requer arbitragem humana."
            ),
        }

    await emit_event(config, AGENT_BIAS_AUDITOR, "node_finished",
                     "Nenhum sinal automático de atenção. RoB 2 por domínio permanece em needs_human_review.",
                     status="COMPLETED", flagged=0)
    return {
        "audited_papers": audited,
        "current_step": "SYNTHESIS",
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "status_message": f"Extração concluída para {len(audited)} artigos. Avaliação RoB 2 completa requer texto integral.",
    }


def human_bias_node(state: LabGraphState) -> Dict[str, Any]:
    """HITL Bias Arbitration Gate: the graph pauses until the researcher judges each flagged study."""
    audited = [dict(a) for a in state.get("audited_papers", [])]
    flagged = [a for a in audited if a.get("needs_bias_arbitration")]
    decision = interrupt({
        "checkpoint": "bias_arbitration",
        "message": "Arbitragem de viés: julgue cada estudo sinalizado e justifique.",
        "flagged": [
            {
                "paper_id": a["paper_id"],
                "doi": a["doi"],
                "title": a["title"],
                "cues": a["design_cues"],
                "attention_cues": a["bias_attention_cues"],
            }
            for a in flagged
        ],
    })

    decided = {d["paper_id"]: d for d in (decision or {}).get("decisions", [])}
    log: List[Dict[str, Any]] = []
    for item in audited:
        entry = decided.get(item["paper_id"])
        if not entry:
            continue
        item["risk_of_bias"] = entry["risk_of_bias"]
        item["risk_assessed_by"] = "human"
        item["risk_justification"] = entry["justification"]
        log.append({
            "paper_id": item["paper_id"],
            "doi": item["doi"],
            "risk_of_bias": entry["risk_of_bias"],
            "justification": entry["justification"],
            "decided_by": "human",
        })

    return {
        "audited_papers": audited,
        "bias_arbitration_log": log,
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "current_step": "SYNTHESIS",
        "status_message": f"Arbitragem de viés registrada para {len(log)} estudo(s). Prosseguindo para a síntese.",
    }
