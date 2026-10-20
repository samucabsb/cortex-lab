export type AgentBenchId = 'coordinator' | 'mining' | 'parsing' | 'auditing' | 'synthesis' | 'hitl';

export type AgentStateStatus =
  | 'IDLE'
  | 'WORKING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'ERROR';

export type RiskOfBiasLevel = 'LOW' | 'SOME_CONCERNS' | 'HIGH' | 'UNCLEAR';

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
  citation_count: number;
  is_screened_in: boolean;
  exclusion_reason?: string;
}

export interface PrismaMatrixItem {
  paper_id: string;
  doi: string;
  citation_key: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  qualis_capes?: string;
  sjr_quartile?: string;
  population_n?: string;
  intervention?: string;
  comparator?: string;
  outcomes?: string;
  risk_of_bias: RiskOfBiasLevel;
  statistical_soundness: string;
  traceable_quote: string;
  page_reference?: number;
}

export interface KnowledgeGapItem {
  gap_id: string;
  title: string;
  domain: string;
  description: string;
  unanswered_question: string;
  supporting_dois: string[];
  suggested_hypothesis: string;
}

export interface ReviewSession {
  review_id: string;
  query: string;
  pico?: PicoData;
  boolean_queries?: string[];
  current_step: string;
  hitl_pending: boolean;
  hitl_checkpoint?: 'screening' | 'bias_arbitration' | null;
  status_message: string;
  raw_papers: PaperItem[];
  screened_papers: PaperItem[];
  audited_papers: any[];
  prisma_matrix: PrismaMatrixItem[];
  knowledge_gaps: KnowledgeGapItem[];
}
