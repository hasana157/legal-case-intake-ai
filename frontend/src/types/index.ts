// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts — Shared TypeScript interfaces for the Opposing-Argument Simulator
// These interfaces are the canonical contract between frontend and backend.
// Milestones 2–5 will populate these with real data but will NOT change the shapes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Input Models ─────────────────────────────────────────────────────────────

/** Case facts submitted by the self-represented litigant on /intake. */
export interface CaseInput {
  plaintiff_name:  string;
  defendant_name:  string;
  /** e.g. "breach_of_contract" | "negligence" | "employment_discrimination" | "landlord_tenant" | "other" */
  claim_type:      string;
  jurisdiction:    string;  // U.S. state or "Federal"
  filing_date:     string;  // ISO 8601 date: YYYY-MM-DD
  incident_date:   string;  // ISO 8601 date: YYYY-MM-DD
  /** Free-text narrative of what happened, minimum 50 chars */
  facts:           string;
  /** What relief/remedy the plaintiff is asking for */
  relief_sought:   string;
}

/** Request body for POST /api/generate-opposition */
export interface GenerateOppositionRequest {
  case_id:    string;
  case_input: CaseInput;
}

// ── Legal Authority ───────────────────────────────────────────────────────────

/**
 * A legal authority retrieved from the vector database (Milestone 2+).
 * In Milestone 1 this is populated with clearly-labeled MOCK data.
 */
export interface RetrievedAuthority {
  case_name:        string;  // e.g. "Smith v. Jones"
  citation:         string;  // e.g. "123 F.3d 456 (9th Cir. 2001)"
  court:            string;
  year:             number;
  jurisdiction:     string;
  /** One-sentence holding / rule extracted from the opinion */
  holding:          string;
  /** Cosine similarity score from vector search, 0–1 */
  relevance_score:  number;
  /** Source URL for the full text, if available */
  url?:             string;
}

// ── Opposition Models ─────────────────────────────────────────────────────────

/**
 * A single opposing argument.
 * Milestone 4 will replace body with streamed text; the structure stays the same.
 */
export interface OpposingArgument {
  id:                     string;
  /** "procedural" | "substantive" | "evidentiary" | "damages" */
  argument_type:          string;
  heading:                string;
  body:                   string;
  supporting_authorities: RetrievedAuthority[];
  /** Model confidence 0–1; used for display only */
  confidence_score:       number;
  /** Tips to help the litigant find weaknesses in this argument */
  weakness_notes:         string;
}

/** Full response from POST /api/generate-opposition */
export interface OpposingArgumentsResponse {
  case_id:          string;
  milestone:        number;
  is_mock:          boolean;
  generated_at:     string;   // ISO 8601 datetime
  arguments:        OpposingArgument[];
  overall_strategy: string;   // High-level opposing strategy summary
  disclaimer:       string;
}

// ── Case Intake Response ──────────────────────────────────────────────────────

/** Structured form of the raw CaseInput after NLP processing (Milestone 3+). */
export interface StructuredCase {
  case_id:                string;
  intake:                 CaseInput;
  claim_category:         string;
  jurisdiction_normalized: string;
  key_legal_issues:       string[];
  processed_at:           string;  // ISO 8601 datetime
}

/** Response from POST /api/intake */
export interface CaseIntakeResponse {
  case_id:         string;
  milestone:       number;
  is_mock:         boolean;
  structured_case: StructuredCase;
  message:         string;
}

// ── Rebuttal ──────────────────────────────────────────────────────────────────

/** A user-authored rebuttal to a specific opposing argument. */
export interface RebuttalEntry {
  argument_id:  string;
  rebuttal_text: string;
  created_at:   string;
  last_updated: string;
}

// ── Health Check ──────────────────────────────────────────────────────────────

export interface HealthResponse {
  status:    string;
  milestone: number;
  version:   string;
  timestamp: string;
}

// ── API Error ─────────────────────────────────────────────────────────────────

export interface ApiError {
  detail:      string;
  status_code: number;
}
