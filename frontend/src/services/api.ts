// =============================================================================
// frontend/src/services/api.ts
// API client for the Opposing-Argument Simulator.
//
// Milestone 2 changes:
// - Added submitCaseIntakeV2() for the V2 intake pipeline.
// - Kept submitCaseIntake() for backward compatibility (simulation page still
//   uses the V1 CaseInput model).
// - Increased timeout to 60s to accommodate Groq LLM extraction on long narratives.
// =============================================================================

import axios, { AxiosError } from 'axios';
import type {
  CaseInput,
  CaseIntakeResponse,
  GenerateOppositionRequest,
  OpposingArgumentsResponse,
  HealthResponse,
} from '@/types';
import type { RawIntake, IntakeResponseV2, StructuredCaseV2 } from '@/types/intake_v2';

export interface RetrievedAuthorityV2 {
  case_name: string;
  citation: string;
  court: string;
  decision_date: string;
  matched_chunk_text: string;
  similarity_score: number;
  jurisdiction: string;
}

export interface RetrievalResponse {
  case_id: string;
  authorities: RetrievedAuthorityV2[];
  insufficient_grounding: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API base URL
//   • Local dev  → Next.js rewrites /api/* to http://localhost:8000/api/*
//   • Production → Vercel serves /api/* from the Python serverless function
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = '';  // empty → relative URLs, works in both dev and prod

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,  // 60s — accommodates Groq LLM extraction + chunking
});

// ── Error normaliser ──────────────────────────────────────────────────────────
function extractMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      // Pydantic v2 validation errors
      return detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ');
    }
    if (error.response?.status) {
      return `Server error ${error.response.status}: ${error.message}`;
    }
    if (error.code === 'ECONNABORTED') return 'Request timed out — is the API server running?';
    if (error.code === 'ERR_NETWORK') return 'Cannot reach API server — is it running on port 8000?';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ── Health check ──────────────────────────────────────────────────────────────
export async function getHealth(): Promise<HealthResponse> {
  try {
    const { data } = await client.get<HealthResponse>('/api/health');
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

// ── Case intake (V1 — backward compatibility) ────────────────────────────────
export async function submitCaseIntake(caseInput: CaseInput): Promise<CaseIntakeResponse> {
  try {
    const { data } = await client.post<CaseIntakeResponse>('/api/intake', caseInput);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

// ── Case intake (V2 — Milestone 2+) ──────────────────────────────────────────
export async function submitCaseIntakeV2(rawIntake: RawIntake): Promise<IntakeResponseV2> {
  try {
    const { data } = await client.post<IntakeResponseV2>('/api/intake', rawIntake);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

// ── Generate opposition (V1 mock — unchanged) ────────────────────────────────
export async function generateOpposition(
  payload: GenerateOppositionRequest,
): Promise<OpposingArgumentsResponse> {
  try {
    const { data } = await client.post<OpposingArgumentsResponse>(
      '/api/generate-opposition',
      payload,
    );
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}

// ── Retrieval (Milestone 3) ──────────────────────────────────────────────────
export async function retrieveAuthorities(
  structuredCase: StructuredCaseV2,
  limit: number = 10,
): Promise<RetrievalResponse> {
  try {
    const { data } = await client.post<RetrievalResponse>(
      `/api/retrieve?limit=${limit}`,
      structuredCase,
    );
    return data;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
}
