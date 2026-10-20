from typing import Dict, List, Any, Optional, TypedDict


class AgentVisualState(TypedDict, total=False):
    agent_id: str
    bench_id: str
    status: str  # 'IDLE' | 'WORKING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'ERROR'
    message: str
    progress_percentage: int


class PicoFramework(TypedDict, total=False):
    population: str
    intervention: str
    comparator: str
    outcome: str


class LabGraphState(TypedDict, total=False):
    # Core Review Identifiers & Parameters
    review_id: str
    query: str
    topic: str
    pico: PicoFramework
    boolean_queries: List[str]
    inclusion_criteria: List[str]
    exclusion_criteria: List[str]
    byok_gemini_key: Optional[str]
    byok_groq_key: Optional[str]

    # Visual & Spatial Engine State (HD-2D Lab Mapping)
    active_agent: str
    current_bench: str
    agent_statuses: Dict[str, str]

    # Paper Collections at Different Pipeline Stages
    raw_papers: List[Dict[str, Any]]
    screened_papers: List[Dict[str, Any]]
    audited_papers: List[Dict[str, Any]]

    # Scientific Synthesis Outputs
    prisma_matrix: List[Dict[str, Any]]
    knowledge_gaps: List[Dict[str, Any]]

    # Human-in-the-Loop (HITL) Oversight Flags
    current_step: str
    hitl_pending: bool
    hitl_checkpoint: Optional[str]
    hitl_decision: Optional[Dict[str, Any]]

    # Telemetry and Execution Status
    status_message: str
    logs: List[str]
    errors: List[str]


# Backward-compatible alias for existing endpoints and tests
CortexWorkflowState = LabGraphState
