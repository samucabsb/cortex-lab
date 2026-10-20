import {
  PaperItem,
  PrismaMatrixItem,
  KnowledgeGapItem,
  PicoData,
} from "@/types";

export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860").replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

export const MOCK_PICO: PicoData = {
  population:
    "Pacientes adultos com neoplasias sólidas refratárias ou modelos pré-clínicos in-vivo",
  intervention:
    "Terapia celular adotiva com linfócitos T modificados (CAR-T Cells de 2ª e 3ª geração)",
  comparator:
    "Quimioterapia citotóxica padrão, inibidores de checkpoint imune (anti-PD-1) ou placebo",
  outcome:
    "Taxa de resposta objetiva (ORR), sobrevida livre de progressão (PFS) e síndrome de liberação de citocinas (CRS)",
};

export const MOCK_BOOLEAN_QUERIES: string[] = [
  '("CAR-T" OR "Chimeric Antigen Receptor") AND ("solid tumors" OR "neoplasms") AND (randomized OR clinical trial)',
  '("CAR-T cells"[Title/Abstract]) AND ("toxicity" OR "efficacy") AND (control OR comparator)',
  '("Adoptive T-cell therapy") AND ("microenvironment") AND (OpenAlex OR EuropePMC)',
];

export const MOCK_PAPERS: PaperItem[] = [
  {
    id: "openalex:W43819201",
    doi: "10.1038/s41591-023-02612-8",
    title:
      "Armored CAR-T cells overcome immunosuppressive tumor microenvironment in solid malignancies: a randomized phase II trial",
    authors: ["Mackall, C. L.", "June, C. H.", "Silva, R. M."],
    year: 2024,
    journal: "Nature Medicine",
    abstract:
      "Background: Chimeric antigen receptor (CAR) T-cell therapy has shown limited efficacy in solid tumors due to T-cell exhaustion. Methods: We randomized n = 128 patients with refractory solid tumors into armored CAR-T versus standard immunotherapy. Results: Armored CAR-T achieved an objective response rate of 54% (p < 0.001) with manageable grade 1-2 cytokine release syndrome.",
    source_api: "OpenAlex",
    doi_verified: true,
    citation_count: 142,
    is_screened_in: true,
  },
  {
    id: "europepmc:PMC1092837",
    doi: "10.1056/nejmoa2308912",
    title:
      "GD2-targeted CAR T cells in high-risk neuroblastoma and solid pediatric sarcomas: long-term follow-up",
    authors: ["Locatelli, F.", "Quintarelli, C.", "De Angelis, B."],
    year: 2024,
    journal: "New England Journal of Medicine",
    abstract:
      "Methods: Prospective cohort of 84 patients treated with third-generation GD2-CAR T cells. Primary endpoints were safety and 3-year event-free survival. Results: Complete remission was observed in 63% of subjects (p = 0.004) compared to historical controls.",
    source_api: "Europe PMC",
    doi_verified: true,
    citation_count: 215,
    is_screened_in: true,
  },
  {
    id: "openalex:W43901122",
    doi: "10.1158/2159-8290.cd-23-0411",
    title:
      "Preliminary single-arm evaluation of mesothelin-directed CAR-T infusion in pleural mesothelioma",
    authors: ["Wang, Y.", "Chen, L.", "Oliveira, S."],
    year: 2023,
    journal: "Cancer Discovery",
    abstract:
      "We evaluated 18 patients in an unblinded pilot study without an active comparator arm. Marginal tumor regression was noted (p = 0.048), though high drop-out rates and absence of power calculation limit generalizability.",
    source_api: "OpenAlex",
    doi_verified: true,
    citation_count: 34,
    is_screened_in: true,
  },
  {
    id: "europepmc:PMC1104921",
    doi: "10.1016/s1470-2045(24)00091-3",
    title:
      "Dual-targeting Claudin18.2 and PD-L1 CAR-T therapy in advanced gastric and pancreatic adenocarcinoma",
    authors: ["Shen, L.", "Qi, C.", "Zhang, X."],
    year: 2024,
    journal: "The Lancet Oncology",
    abstract:
      "In this multicenter controlled study of 160 participants, dual-targeting CAR-T cells demonstrated superior progression-free survival (median 8.4 months vs 3.9 months, p < 0.001) with blinded independent central review.",
    source_api: "Europe PMC",
    doi_verified: true,
    citation_count: 96,
    is_screened_in: true,
  },
];

export const MOCK_PRISMA_ROWS: PrismaMatrixItem[] = [
  {
    paper_id: "openalex:W43819201",
    doi: "10.1038/s41591-023-02612-8",
    citation_key: "Mackall2024",
    title:
      "Armored CAR-T cells overcome immunosuppressive tumor microenvironment in solid malignancies: a randomized phase II trial",
    authors: ["Mackall, C. L.", "June, C. H.", "Silva, R. M."],
    year: 2024,
    journal: "Nature Medicine",
    qualis_capes: "A1",
    sjr_quartile: "Q1",
    population_n: "N = 128 pacientes",
    intervention: "Linfócitos CAR-T blindados (Armored CAR-T) resistentes à exaustão",
    comparator: "Imunoterapia padrão (Inibidores de Checkpoint)",
    outcomes: "Taxa de resposta objetiva de 54% (p < 0.001) com toxicidade controlada",
    risk_of_bias: "LOW",
    statistical_soundness: "AUDITADO & VERIFICADO",
    traceable_quote:
      '"Armored CAR-T achieved an objective response rate of 54% (p < 0.001) with manageable grade 1-2 cytokine release syndrome."',
    page_reference: 4,
  },
  {
    paper_id: "europepmc:PMC1092837",
    doi: "10.1056/nejmoa2308912",
    citation_key: "Locatelli2024",
    title:
      "GD2-targeted CAR T cells in high-risk neuroblastoma and solid pediatric sarcomas: long-term follow-up",
    authors: ["Locatelli, F.", "Quintarelli, C.", "De Angelis, B."],
    year: 2024,
    journal: "New England Journal of Medicine",
    qualis_capes: "A1",
    sjr_quartile: "Q1",
    population_n: "N = 84 pacientes",
    intervention: "GD2-CAR T cells de 3ª geração com domínio coestimulatório duplo",
    comparator: "Coorte controle histórica pareada",
    outcomes: "Remissão completa em 63% dos sujeitos (p = 0.004) em seguimento de 3 anos",
    risk_of_bias: "SOME_CONCERNS",
    statistical_soundness: "AUDITADO & VERIFICADO",
    traceable_quote:
      '"Complete remission was observed in 63% of subjects (p = 0.004) compared to historical controls."',
    page_reference: 6,
  },
  {
    paper_id: "openalex:W43901122",
    doi: "10.1158/2159-8290.cd-23-0411",
    citation_key: "Wang2023",
    title:
      "Preliminary single-arm evaluation of mesothelin-directed CAR-T infusion in pleural mesothelioma",
    authors: ["Wang, Y.", "Chen, L.", "Oliveira, S."],
    year: 2023,
    journal: "Cancer Discovery",
    qualis_capes: "A1",
    sjr_quartile: "Q1",
    population_n: "N = 18 pacientes",
    intervention: "Infusão local de CAR-T anti-mesotelina",
    comparator: "Sem braço comparador ativo (estudo aberto)",
    outcomes: "Regressão tumoral limítrofe (p = 0.048) com perda de seguimento",
    risk_of_bias: "HIGH",
    statistical_soundness: "ALERTA DE SUBAMOSTRAGEM",
    traceable_quote:
      '"Marginal tumor regression was noted (p = 0.048), though high drop-out rates and absence of power calculation limit generalizability."',
    page_reference: 3,
  },
  {
    paper_id: "europepmc:PMC1104921",
    doi: "10.1016/s1470-2045(24)00091-3",
    citation_key: "Shen2024",
    title:
      "Dual-targeting Claudin18.2 and PD-L1 CAR-T therapy in advanced gastric and pancreatic adenocarcinoma",
    authors: ["Shen, L.", "Qi, C.", "Zhang, X."],
    year: 2024,
    journal: "The Lancet Oncology",
    qualis_capes: "A1",
    sjr_quartile: "Q1",
    population_n: "N = 160 participantes",
    intervention: "CAR-T biespecífico Claudin18.2 / PD-L1",
    comparator: "Quimioterapia sistêmica controlada com revisão central cega",
    outcomes: "Sobrevida livre de progressão mediana de 8.4 vs 3.9 meses (p < 0.001)",
    risk_of_bias: "LOW",
    statistical_soundness: "AUDITADO & VERIFICADO",
    traceable_quote:
      '"Dual-targeting CAR-T cells demonstrated superior progression-free survival (median 8.4 months vs 3.9 months, p < 0.001) with blinded independent central review."',
    page_reference: 5,
  },
];

export const MOCK_GAPS: KnowledgeGapItem[] = [
  {
    gap_id: "GAP-001",
    title: "Persistência longitudinal de células CAR-T e exaustão no microambiente tumoral (> 24 meses)",
    domain: "Imunologia Clínica & Seguimento Longitudinal",
    description:
      "Embora as taxas de resposta inicial nos primeiros 6 a 12 meses sejam promissoras, a maioria dos ensaios clínicos não reporta a cinética de exaustão linfocitária nem taxas de recidiva tardia após 24 meses.",
    unanswered_question:
      "Qual é o impacto de doses de reforço ou modulação epigenética na persistência de CAR-T em tumores sólidos após 24 e 36 meses?",
    supporting_dois: [
      "10.1038/s41591-023-02612-8",
      "10.1056/nejmoa2308912",
      "10.1016/s1470-2045(24)00091-3",
    ],
    suggested_hypothesis:
      "Protocolos combinados com bloqueio epigenético de exaustão aumentarão a sobrevida livre de progressão em 24 meses em pelo menos 35%.",
  },
  {
    gap_id: "GAP-002",
    title: "Representatividade demográfica e validação multicêntrica fora do eixo América do Norte / Europa",
    domain: "Validade Externa & Farmacogenômica",
    description:
      "Mais de 85% dos pacientes recrutados nos estudos auditados concentram-se em centros de referência do hemisfério norte, sem estratificação por diversidade genética ou viabilidade de manufatura point-of-care na América Latina.",
    unanswered_question:
      "Como plataformas descentralizadas de manufatura acadêmica impactam o custo-efetividade e a resposta clínica em populações diversas?",
    supporting_dois: [
      "10.1158/2159-8290.cd-23-0411",
      "10.1016/s1470-2045(24)00091-3",
    ],
    suggested_hypothesis:
      "Sistemas automatizados de manufatura local reduzirão o tempo vein-to-vein de 28 para 9 dias mantendo equivalência estatística de resposta.",
  },
];

export interface CreateReviewOptions {
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
  byokGeminiKey?: string;
  byokGroqKey?: string;
}

export async function createReview(
  topic: string,
  options: CreateReviewOptions = {}
) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      inclusion_criteria: options.inclusionCriteria || [],
      exclusion_criteria: options.exclusionCriteria || [],
      byok_gemini_key: options.byokGeminiKey || undefined,
      byok_groq_key: options.byokGroqKey || undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Falha no servidor da API (HTTP ${response.status}): ${errorBody || response.statusText}`);
  }
  return await response.json();
}

export async function submitHitlDecision(
  reviewId: string,
  stepCheckpoint: "screening" | "bias_arbitration",
  approvedPaperIds: string[],
  rejectedPaperIds: string[],
  notes: string = ""
) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1/reviews/${reviewId}/hitl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      review_id: reviewId,
      step_checkpoint: stepCheckpoint,
      action: "APPROVE",
      approved_paper_ids: approvedPaperIds,
      rejected_paper_ids: rejectedPaperIds,
      notes,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Falha na validação HITL (HTTP ${response.status}): ${errorBody || response.statusText}`);
  }
  return await response.json();
}

/**
 * Returns clean reference demo data explicitly for demonstration and UI testing purposes.
 */
export function getDemoReviewData(topic: string = "Eficácia e toxicidade de células CAR-T em tumores sólidos") {
  return {
    review_id: "demo-cart-cells",
    status: "SCREENING_CHECKPOINT",
    pico: {
      ...MOCK_PICO,
      intervention: `Protocolo investigado para '${topic}'`,
    },
    boolean_queries: MOCK_BOOLEAN_QUERIES,
    hitl_pending: true,
    hitl_checkpoint: "screening" as const,
    message: `[Modo Demonstração] Carregados ${MOCK_PAPERS.length} artigos científicos para teste do fluxo e do Laboratório Pixel Art.`,
    papers_found: MOCK_PAPERS.length,
    papers: MOCK_PAPERS,
    prisma_matrix: MOCK_PRISMA_ROWS,
    knowledge_gaps: MOCK_GAPS,
  };
}

