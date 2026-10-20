import logging
from typing import Any, Dict, Optional
from langchain_core.runnables import RunnableConfig
from app.agents.state import LabGraphState, PicoFramework
from app.core.llm_provider import MultiProviderLLMManager
from app.prompts import load_prompt
from app.services.events import AGENT_COORDINATOR, emit_event

logger = logging.getLogger("cortexlab.agents.coordinator")

PICO_FIELDS = ("population", "intervention", "comparator", "outcome")


async def pi_coordinator_node(state: LabGraphState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    """PI Coordinator Agent: registers and validates the protocol defined by the researcher.

    The researcher owns the PICO and the Boolean query. This node never invents either one;
    it refuses to start a review whose protocol is incomplete.
    """
    topic = state.get("query") or state.get("topic") or ""
    pico = state.get("pico") or {}
    queries = [q.strip() for q in (state.get("boolean_queries") or []) if q and q.strip()]
    missing = [f for f in PICO_FIELDS if not str(pico.get(f) or "").strip()]
    logger.info(f"[PI Coordinator] Registering protocol for: {topic}")

    await emit_event(config, AGENT_COORDINATOR, "node_started", "Coordenador validando o protocolo definido pelo pesquisador",
                     status="WORKING")

    if missing or not queries:
        problems = [f"campo PICO ausente: {f}" for f in missing]
        if not queries:
            problems.append("nenhuma query booleana informada")
        await emit_event(config, AGENT_COORDINATOR, "node_failed", "Protocolo incompleto: " + "; ".join(problems),
                         status="ERROR", problems=problems)
        return {
            "errors": problems,
            "current_step": "ERROR",
            "hitl_pending": False,
            "hitl_checkpoint": None,
            "status_message": "Protocolo incompleto. O pesquisador deve preencher P, I, C, O e a query booleana.",
        }

    registered: PicoFramework = {f: str(pico[f]).strip() for f in PICO_FIELDS}  # type: ignore[typeddict-item]
    origin = "sugestão de IA revisada pelo pesquisador" if state.get("ai_assisted") else "definição manual do pesquisador"

    await emit_event(config, AGENT_COORDINATOR, "protocol_registered",
                     f"Protocolo PICO registrado ({origin}) com {len(queries)} query(ies) booleana(s)",
                     status="COMPLETED", pico=registered, boolean_queries=queries,
                     ai_assisted=bool(state.get("ai_assisted")))

    return {
        "pico": registered,
        "boolean_queries": queries,
        "errors": [],
        "current_step": "MINING",
        "hitl_pending": False,
        "hitl_checkpoint": None,
        "status_message": f"Protocolo registrado ({origin}). Iniciando mineração da literatura.",
    }


async def suggest_protocol(
    topic: str, byok_gemini: Optional[str] = None, byok_groq: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Optional 'Sugerir com IA'. Returns None without an LLM key or on an unusable answer.

    Not part of the graph: a suggestion is only a draft the researcher must review and confirm.
    """
    llm_manager = MultiProviderLLMManager(byok_gemini=byok_gemini, byok_groq=byok_groq)
    if not llm_manager.has_active_key:
        return None

    user_prompt = (
        f"Estruture o protocolo de revisão sistemática (PICO, 3 queries booleanas e critérios de elegibilidade) "
        f"para o seguinte tema de pesquisa científica: '{topic}'.\n\n"
        "Retorne EXCLUSIVAMENTE um objeto JSON válido com a seguinte estrutura exata:\n"
        "{\n"
        '  "pico": {\n'
        '    "population": "...",\n'
        '    "intervention": "...",\n'
        '    "comparator": "...",\n'
        '    "outcome": "..."\n'
        "  },\n"
        '  "boolean_queries": ["query 1", "query 2", "query 3"],\n'
        '  "inclusion_criteria": ["criterio 1", "criterio 2", "criterio 3"],\n'
        '  "exclusion_criteria": ["criterio 1", "criterio 2", "criterio 3"]\n'
        "}"
    )
    parsed = await llm_manager.invoke_json(prompt=user_prompt, system_message=load_prompt("pi_coordinator"))
    if not isinstance(parsed, dict) or not isinstance(parsed.get("pico"), dict):
        return None

    raw_pico = parsed["pico"]
    pico = {f: str(raw_pico.get(f) or "").strip() for f in PICO_FIELDS}
    queries = [str(q).strip() for q in (parsed.get("boolean_queries") or []) if str(q).strip()]
    if not all(pico.values()) or not queries:
        return None

    return {
        "pico": pico,
        "boolean_queries": queries,
        "inclusion_criteria": [str(c) for c in (parsed.get("inclusion_criteria") or [])],
        "exclusion_criteria": [str(c) for c in (parsed.get("exclusion_criteria") or [])],
    }
