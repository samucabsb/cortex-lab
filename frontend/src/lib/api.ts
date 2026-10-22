import {
  PicoData,
  ReviewSnapshot,
  ScreeningDecisionInput,
  BiasDecisionInput,
} from '@/types';

export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export interface ByokKeyOptions {
  byokGeminiKey?: string;
  byokGroqKey?: string;
}

export interface CreateReviewPayload {
  topic: string;
  pico: PicoData;
  boolean_queries: string[];
  ai_assisted?: boolean;
  inclusion_criteria?: string[];
  exclusion_criteria?: string[];
  max_papers?: number;
  year_start?: number;
  year_end?: number;
  byok_gemini_key?: string;
  byok_groq_key?: string;
}

/**
 * Optional AI suggestion for PICO and Boolean queries. Requires a BYOK API key.
 */
export async function suggestProtocol(
  topic: string,
  keys: ByokKeyOptions = {}
): Promise<{
  pico: PicoData;
  boolean_queries: string[];
  inclusion_criteria?: string[];
  exclusion_criteria?: string[];
  source: string;
  note: string;
}> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/protocol/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      byok_gemini_key: keys.byokGeminiKey || undefined,
      byok_groq_key: keys.byokGroqKey || undefined,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Falha na sugestão por IA (HTTP ${resp.status})`);
  }
  return await resp.json();
}

/**
 * Starts a real review workflow in the background. The researcher defines the protocol.
 */
export async function createReview(
  payload: CreateReviewPayload
): Promise<{ review_id: string; thread_id: string; status: string; events_url: string }> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    throw new Error(msg || `Falha ao iniciar revisão (HTTP ${resp.status})`);
  }
  return await resp.json();
}

/**
 * Queries the persisted snapshot of a review from LangGraph SQLite checkpoints.
 */
export async function getReview(reviewId: string): Promise<ReviewSnapshot> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/reviews/${reviewId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Revisão não encontrada (HTTP ${resp.status})`);
  }
  return await resp.json();
}

/**
 * Submits sovereign human screening decisions for each paper (inclusion or justified exclusion).
 */
export async function submitScreeningDecision(
  reviewId: string,
  decisions: ScreeningDecisionInput[],
  keys: ByokKeyOptions = {},
  notes: string = ''
): Promise<{ review_id: string; status: string }> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/reviews/${reviewId}/hitl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step_checkpoint: 'screening',
      screening: decisions,
      notes: notes || undefined,
      byok_gemini_key: keys.byokGeminiKey || undefined,
      byok_groq_key: keys.byokGroqKey || undefined,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    throw new Error(msg || `Falha ao registrar triagem humana (HTTP ${resp.status})`);
  }
  return await resp.json();
}

/**
 * Submits researcher judgment for studies flagged for methodological bias attention.
 */
export async function submitBiasDecision(
  reviewId: string,
  decisions: BiasDecisionInput[],
  keys: ByokKeyOptions = {},
  notes: string = ''
): Promise<{ review_id: string; status: string }> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/reviews/${reviewId}/hitl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step_checkpoint: 'bias_arbitration',
      bias: decisions,
      notes: notes || undefined,
      byok_gemini_key: keys.byokGeminiKey || undefined,
      byok_groq_key: keys.byokGroqKey || undefined,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    const msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    throw new Error(msg || `Falha ao registrar arbitragem de viés (HTTP ${resp.status})`);
  }
  return await resp.json();
}

/**
 * Retries a review from the last checkpoint if stopped or crashed.
 */
export async function retryReview(reviewId: string): Promise<{ review_id: string; status: string }> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/reviews/${reviewId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `Falha ao retomar revisão (HTTP ${resp.status})`);
  }
  return await resp.json();
}

export function getCsvExportUrl(reviewId: string): string {
  return `${getApiBaseUrl()}/v1/reviews/${reviewId}/export/csv`;
}

export function getBibtexExportUrl(reviewId: string): string {
  return `${getApiBaseUrl()}/v1/reviews/${reviewId}/export/bibtex`;
}

export async function translatePapers(
  items: Array<{ id: string; title: string; abstract?: string }>,
  targetLang: string = 'pt'
): Promise<Record<string, { title_pt: string; abstract_pt: string }>> {
  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/v1/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, target_lang: targetLang }),
  });

  if (!resp.ok) {
    throw new Error(`Falha ao traduzir textos (HTTP ${resp.status})`);
  }
  const data = await resp.json();
  return data.translations || {};
}

