import logging
from typing import Dict, Any
from app.agents.state import LabGraphState, PicoFramework
from app.core.llm_provider import MultiProviderLLMManager
from app.prompts import load_prompt

logger = logging.getLogger("cortexlab.agents.coordinator")


async def pi_coordinator_node(state: LabGraphState) -> Dict[str, Any]:
    """PI Coordinator Agent: Deconstructs research question into PICO and Boolean strategies."""
    topic = state.get("query") or state.get("topic") or "Biomedical Systematic Review"
    system_prompt = load_prompt("pi_coordinator")
    logger.info(f"[PI Coordinator] Formulating protocol for: {topic}")

    llm_manager = MultiProviderLLMManager(
        byok_gemini=state.get("byok_gemini_key"),
        byok_groq=state.get("byok_groq_key"),
    )

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

    parsed_json = await llm_manager.invoke_json(prompt=user_prompt, system_message=system_prompt)

    if isinstance(parsed_json, dict) and "pico" in parsed_json:
        raw_pico = parsed_json.get("pico") or {}
        pico: PicoFramework = {
            "population": str(raw_pico.get("population", f"População clínica ou experimental em {topic}")),
            "intervention": str(raw_pico.get("intervention", f"Intervenção ou protocolo avaliado em {topic}")),
            "comparator": str(raw_pico.get("comparator", "Controle padrão, placebo ou linha de base comparativa")),
            "outcome": str(raw_pico.get("outcome", "Eficácia quantitativa, segurança e significância estatística")),
        }
        boolean_queries = parsed_json.get("boolean_queries") or [topic]
        inclusion = state.get("inclusion_criteria") or parsed_json.get("inclusion_criteria") or []
        exclusion = state.get("exclusion_criteria") or parsed_json.get("exclusion_criteria") or []
    else:
        # Deterministic scientific protocol fallback when operating without API keys
        topic_keywords = [w for w in topic.replace(",", " ").split() if len(w) > 3]
        primary_subject = topic_keywords[0] if topic_keywords else topic
        intervention_subject = " ".join(topic_keywords[1:3]) if len(topic_keywords) > 1 else topic

        pico = {
            "population": f"Pacientes, coortes clínicas ou modelos experimentais relacionados a {topic}",
            "intervention": f"Protocolo terapêutico, tecnológico ou analítico focado em {intervention_subject}",
            "comparator": "Padrão-ouro clínico, grupo controle ativo, placebo ou baseline comparativo",
            "outcome": "Desfechos primários de eficácia, segurança metodológica e significância estatística (p < 0.05)",
        }

        boolean_queries = [
            f"{topic}",
            f'("{primary_subject}") AND ("{intervention_subject}") AND (trial OR review OR cohort)',
            f'("{topic}") AND (randomized OR control OR methodology)',
        ]

        inclusion = state.get("inclusion_criteria") or [
            "Artigos originais revisados por pares com DOI verificável",
            "Metodologia empírica com tamanho amostral (N) e estatística descritos",
            "Presença de grupo comparador/controle ou benchmark validado",
            "Publicações entre 2018 e 2026 em acesso aberto ou indexadas",
        ]

        exclusion = state.get("exclusion_criteria") or [
            "Editoriais opinativos, cartas ao editor ou resumos sem dados estatísticos",
            "Estudos sem descrição clara de protocolo metodológico ou sem controle",
            "Publicações sem identificador DOI válido na Crossref/OpenAlex",
        ]

    current_statuses = dict(state.get("agent_statuses") or {})
    current_statuses["coordinator"] = "COMPLETED"
    current_statuses["miner"] = "WORKING"

    return {
        "pico": pico,
        "boolean_queries": boolean_queries,
        "inclusion_criteria": inclusion,
        "exclusion_criteria": exclusion,
        "active_agent": "coordinator",
        "current_bench": "bench_coordinator",
        "agent_statuses": current_statuses,
        "current_step": "MINING",
        "status_message": f"PI Coordinator estruturou protocolo PICO e {len(boolean_queries)} queries booleanas para '{topic}'.",
    }
