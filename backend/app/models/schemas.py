from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class AgentBenchType(str, Enum):
    MINING = "mining"
    PARSING = "parsing"
    AUDITING = "auditing"
    SYNTHESIS = "synthesis"
    HITL_STATION = "hitl_station"


class AgentStatus(str, Enum):
    IDLE = "IDLE"
    WORKING = "WORKING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class RiskOfBiasLevel(str, Enum):
    LOW = "LOW"
    SOME_CONCERNS = "SOME_CONCERNS"
    HIGH = "HIGH"
    UNCLEAR = "UNCLEAR"


class Paper(BaseModel):
    id: str = Field(..., description="Unique paper identifier (DOI or canonical ID)")
    doi: Optional[str] = None
    title: str
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    journal: Optional[str] = None
    abstract: Optional[str] = None
    source_api: str = Field(..., description="OpenAlex, EuropePMC, SemanticScholar, arXiv")
    open_access_pdf_url: Optional[str] = None
    doi_verified: bool = False
    citation_count: int = 0
    is_screened_in: bool = True
    exclusion_reason: Optional[str] = None


class ParagraphEvidence(BaseModel):
    section_name: str
    page_number: Optional[int] = 1
    paragraph_index: int
    text_quote: str
    content_hash: str


class StatisticalAudit(BaseModel):
    sample_size_n: Optional[int] = None
    power_calculation_reported: bool = False
    p_values_reported: List[str] = Field(default_factory=list)
    p_hacking_risk: str = "LOW"
    audit_notes: str
    evidence_quotes: List[str] = Field(default_factory=list)


class RiskOfBiasReport(BaseModel):
    overall_risk: RiskOfBiasLevel = RiskOfBiasLevel.LOW
    randomization_bias: RiskOfBiasLevel = RiskOfBiasLevel.LOW
    blinding_bias: RiskOfBiasLevel = RiskOfBiasLevel.LOW
    selective_reporting_bias: RiskOfBiasLevel = RiskOfBiasLevel.LOW
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    audit_summary: str
    verbatim_evidence: List[str] = Field(default_factory=list)
    requires_human_arbitration: bool = False


class PrismaMatrixRow(BaseModel):
    paper_id: str
    doi: Optional[str] = None
    citation_key: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    journal: Optional[str] = None
    qualis_capes: Optional[str] = "N/A"
    sjr_quartile: Optional[str] = "N/A"
    population_n: Optional[str] = None
    intervention: Optional[str] = None
    comparator: Optional[str] = None
    outcomes: Optional[str] = None
    risk_of_bias: RiskOfBiasLevel = RiskOfBiasLevel.LOW
    statistical_soundness: str = "AUDITED"
    traceable_quote: str
    page_reference: Optional[int] = None


class KnowledgeGap(BaseModel):
    gap_id: str
    title: str
    domain: str
    description: str
    unanswered_question: str
    supporting_dois: List[str] = Field(default_factory=list)
    suggested_hypothesis: str


class CreateReviewRequest(BaseModel):
    topic: str
    inclusion_criteria: List[str] = Field(default_factory=list)
    exclusion_criteria: List[str] = Field(default_factory=list)
    max_papers: int = 20
    year_start: Optional[int] = 2018
    year_end: Optional[int] = 2026
    require_open_access: bool = True
    byok_gemini_key: Optional[str] = None
    byok_groq_key: Optional[str] = None


class HITLDecisionRequest(BaseModel):
    review_id: str
    step_checkpoint: str  # "screening" or "bias_arbitration"
    action: str  # "APPROVE", "REJECT", "OVERRIDE"
    approved_paper_ids: Optional[List[str]] = None
    rejected_paper_ids: Optional[List[str]] = None
    notes: Optional[str] = None


class AgentTelemetryEvent(BaseModel):
    timestamp: str
    bench: AgentBenchType
    agent_name: str
    status: AgentStatus
    current_action: str
    progress_percentage: int
    papers_processed: int
    papers_total: int
    active_conduit_target: Optional[AgentBenchType] = None
    message: str
    data_payload: Optional[Dict[str, Any]] = None
