from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


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
    doi_status: str = Field(
        default="unchecked",
        description="unchecked | verified | title_mismatch | not_found | unreachable | invalid | no_doi",
    )
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
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    journal: Optional[str] = None
    qualis_capes: str = "not_found"
    sjr_quartile: str = "not_found"
    population_n: str = "not_found"
    intervention: str = "needs_human_review"
    comparator: str = "not_found"
    outcomes: str = "needs_human_review"
    risk_of_bias: str = "needs_human_review"
    statistical_soundness: str = "needs_human_review"
    traceable_quote: str = "not_found"
    page_reference: Optional[int] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeGap(BaseModel):
    gap_id: str
    title: str
    domain: str
    description: str
    unanswered_question: str
    supporting_dois: List[str] = Field(default_factory=list)
    suggested_hypothesis: str


class PicoInput(BaseModel):
    population: str
    intervention: str
    comparator: str
    outcome: str

    @field_validator("population", "intervention", "comparator", "outcome")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = (value or "").strip()
        if len(value) < 3:
            raise ValueError("campo PICO obrigatório (preenchido pelo pesquisador)")
        return value


class ProtocolSuggestionRequest(BaseModel):
    topic: str = Field(..., min_length=5)
    byok_gemini_key: Optional[str] = None
    byok_groq_key: Optional[str] = None


class CreateReviewRequest(BaseModel):
    """The researcher defines the protocol. The system never invents a PICO."""

    topic: str = Field(..., min_length=5, description="Pergunta de pesquisa")
    pico: PicoInput
    boolean_queries: List[str] = Field(..., min_length=1)
    ai_assisted: bool = Field(default=False, description="PICO/query partiram de uma sugestão de IA revisada")
    inclusion_criteria: List[str] = Field(default_factory=list)
    exclusion_criteria: List[str] = Field(default_factory=list)
    max_papers: int = Field(default=20, ge=1, le=50)
    year_start: Optional[int] = 2018
    year_end: Optional[int] = 2026
    byok_gemini_key: Optional[str] = None
    byok_groq_key: Optional[str] = None

    @field_validator("boolean_queries")
    @classmethod
    def _clean_queries(cls, queries: List[str]) -> List[str]:
        cleaned = [q.strip() for q in queries if q and q.strip()]
        if not cleaned:
            raise ValueError("ao menos uma query booleana é obrigatória")
        return cleaned


class ScreeningDecision(BaseModel):
    paper_id: str
    decision: Literal["include", "exclude"]
    reason: Optional[str] = None

    @model_validator(mode="after")
    def _exclusion_needs_reason(self) -> "ScreeningDecision":
        if self.decision == "exclude" and len((self.reason or "").strip()) < 3:
            raise ValueError(f"exclusão de '{self.paper_id}' exige justificativa")
        return self


class BiasDecision(BaseModel):
    paper_id: str
    risk_of_bias: Literal["LOW", "SOME_CONCERNS", "HIGH"]
    justification: str = Field(..., min_length=3)


class HITLDecisionRequest(BaseModel):
    step_checkpoint: Literal["screening", "bias_arbitration"]
    screening: Optional[List[ScreeningDecision]] = None
    bias: Optional[List[BiasDecision]] = None
    notes: Optional[str] = None
    # BYOK keys live only in memory; re-send them to resume after a server restart.
    byok_gemini_key: Optional[str] = None
    byok_groq_key: Optional[str] = None
