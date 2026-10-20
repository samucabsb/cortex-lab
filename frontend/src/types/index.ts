export type EvidenceStatus = 'found' | 'not_found' | 'needs_human_review';

export interface Evidence {
  status: EvidenceStatus;
  value: string;
  quote?: string;
  source?: string;
  doi?: string;
  method?: string;
  note?: string;
}

export interface PicoData {
  population: string;
  intervention: string;
  comparator: string;
  outcome: string;
}

export interface PaperItem {
  id: string;
  doi?: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  abstract?: string;
  source_api: string;
  open_access_pdf_url?: string;
  doi_verified: boolean;
  doi_status: 'unchecked' | 'verified' | 'title_mismatch' | 'not_found' | 'unreachable' | 'invalid' | 'no_doi';
  citation_count: number;
  is_screened_in: boolean;
  exclusion_reason?: string;
}

export interface PrismaMatrixItem {
  paper_id: string;
  doi: string;
  doi_status?: string;
  citation_key: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  qualis_capes: string;
  sjr_quartile: string;
  population_n: string;
  intervention: string;
  comparator: string;
  outcomes: string;
  risk_of_bias: string;
  statistical_soundness: string;
  traceable_quote: string;
  page_reference?: number;
  evidence?: {
    population_n?: Evidence;
    intervention?: Evidence;
    comparator?: Evidence;
    outcomes?: Evidence;
    p_values?: Evidence[];
    design_cues?: Evidence[];
    risk_of_bias?: {
      value: string;
      assessed_by?: string;
      justification?: string;
      rob2_domains?: Record<string, string>;
      note?: string;
    };
  };
}

export interface KnowledgeGapItem {
  gap_id: string;
  title: string;
  domain: string;
  description: string;
  unanswered_question: string;
  suggested_hypothesis: string;
  supporting?: Array<{ paper_id: string; doi?: string; quote: string }>;
  supporting_dois: string[];
  origin?: string;
}

export interface AgentEvent {
  seq: number;
  ts: string;
  thread_id: string;
  agent: string;
  kind: string;
  status?: string;
  source?: string;
  message: string;
  data?: Record<string, any>;
}

export type ScientistId = 'turing' | 'ada' | 'cross' | 'fitz' | 'cochrane' | 'rosalind';

export interface ScientistCardInfo {
  id: ScientistId;
  agentKey: string;
  name: string;
  role: string;
  affiliation: string;
  avatarInitials: string;
  status: 'IDLE' | 'WORKING' | 'WAITING_HUMAN' | 'COMPLETED' | 'ERROR';
  lastAction: string;
  detail?: string;
  metricLabel?: string;
  metricValue?: string | number;
}

export interface ScreeningDecisionInput {
  paper_id: string;
  decision: 'include' | 'exclude';
  reason?: string;
}

export interface BiasDecisionInput {
  paper_id: string;
  risk_of_bias: 'LOW' | 'SOME_CONCERNS' | 'HIGH';
  justification: string;
}

export interface ReviewSnapshot {
  review_id: string;
  status: 'RUNNING' | 'AWAITING_HUMAN' | 'COMPLETED' | 'ERROR';
  hitl?: {
    checkpoint: 'screening' | 'bias_arbitration';
    message: string;
    paper_ids?: string[];
    flagged?: Array<{
      paper_id: string;
      doi?: string;
      title: string;
      cues: any[];
      attention_cues: string[];
    }>;
  } | null;
  topic?: string;
  pico?: PicoData;
  boolean_queries?: string[];
  ai_assisted?: boolean;
  raw_papers?: PaperItem[];
  screened_papers?: PaperItem[];
  screening_log?: Array<{ paper_id: string; doi?: string; decision: string; reason?: string }>;
  audited_papers?: any[];
  bias_arbitration_log?: Array<{ paper_id: string; doi?: string; risk_of_bias: string; justification: string }>;
  prisma_matrix?: PrismaMatrixItem[];
  knowledge_gaps?: KnowledgeGapItem[];
  status_message?: string;
  current_step?: string;
  last_event_seq?: number;
  errors?: string[];
}
