from typing import Any, Dict, List, Optional, TypedDict


class PicoFramework(TypedDict, total=False):
    population: str
    intervention: str
    comparator: str
    outcome: str


class LabGraphState(TypedDict, total=False):
    """Checkpointed workflow state. Never contains BYOK keys (see core/key_vault.py)."""

    # Core Review Identifiers & Protocol (defined by the researcher)
    review_id: str
    query: str
    topic: str
    pico: PicoFramework
    boolean_queries: List[str]
    ai_assisted: bool
    inclusion_criteria: List[str]
    exclusion_criteria: List[str]
    max_papers: int
    year_start: Optional[int]
    year_end: Optional[int]

    # Paper Collections at Different Pipeline Stages
    raw_papers: List[Dict[str, Any]]
    screened_papers: List[Dict[str, Any]]
    screening_log: List[Dict[str, Any]]
    audited_papers: List[Dict[str, Any]]
    bias_arbitration_log: List[Dict[str, Any]]

    # Scientific Synthesis Outputs
    prisma_matrix: List[Dict[str, Any]]
    knowledge_gaps: List[Dict[str, Any]]

    # Human-in-the-Loop (HITL) Oversight Flags
    current_step: str
    hitl_pending: bool
    hitl_checkpoint: Optional[str]

    # Execution Status
    status_message: str
    errors: List[str]


# Backward-compatible alias
CortexWorkflowState = LabGraphState
