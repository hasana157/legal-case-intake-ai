// =============================================================================
// frontend/src/types/intake_v2.ts
// Milestone 2 — TypeScript mirror of api/models/structured_case.py
//
// These types are the canonical frontend contract for the V2 intake pipeline.
// Field names match the Python Pydantic models EXACTLY — any rename on the
// backend must be reflected here and vice versa.
// =============================================================================

// ── Enumerations ──────────────────────────────────────────────────────────────

export type ClaimType =
  | 'small_claims'
  | 'tenancy'
  | 'family'
  | 'contract'
  | 'employment'
  | 'personal_injury'
  | 'property'
  | 'other';

export type PartyRole = 'plaintiff' | 'defendant' | 'third_party';

export type EvidenceType =
  | 'document'
  | 'photo'
  | 'video'
  | 'witness'
  | 'digital'
  | 'physical'
  | 'other';

export type ExtractionMethod = 'groq_llm' | 'regex_fallback';

// ── Sub-models ────────────────────────────────────────────────────────────────

export interface Party {
  name: string;
  role: PartyRole;
}

export interface KeyDate {
  label: string;
  date: string;  // ISO 8601: YYYY-MM-DD
}

export interface EvidenceItem {
  description: string;
  type: EvidenceType;
}

// ── Wizard form data (RawIntake) ──────────────────────────────────────────────
// Exactly mirrors api/models/structured_case.py → RawIntake.
// This is what the frontend POSTs to /api/intake.

export interface RawIntake {
  parties:      Party[];
  claim_type:   ClaimType;
  jurisdiction: string;
  key_dates:    KeyDate[];
  narrative:    string;
  evidence:     EvidenceItem[];
}

// ── Structured case (StructuredCaseV2) ────────────────────────────────────────
// The backend's fully extracted and validated representation.

export interface StructuredCaseV2 {
  case_id:                string;
  jurisdiction:           string;
  claim_type:             ClaimType;
  parties:                Party[];
  key_dates:              KeyDate[];
  disputed_facts:         string[];
  available_evidence:     EvidenceItem[];
  raw_narrative:          string;
  jurisdiction_validated: boolean;
  missing_context:        string[];
  extraction_confidence:  number;    // 0.0 – 1.0
  processed_at:           string;    // ISO 8601 datetime
}

// ── API response (IntakeResponseV2) ───────────────────────────────────────────

export interface IntakeResponseV2 {
  case_id:           string;
  milestone:         number;
  is_mock:           boolean;
  extraction_method: ExtractionMethod;
  structured_case:   StructuredCaseV2;
  missing_context:   string[];   // top-level echo for convenient rendering
  message:           string;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  small_claims:    'Small Claims',
  tenancy:         'Tenancy / Landlord-Tenant',
  family:          'Family Law',
  contract:        'Contract Dispute',
  employment:      'Employment',
  personal_injury: 'Personal Injury',
  property:        'Property Dispute',
  other:           'Other',
};

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  plaintiff:   'Plaintiff (you)',
  defendant:   'Defendant (opposing party)',
  third_party: 'Third Party',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  document: 'Document',
  photo:    'Photo / Image',
  video:    'Video',
  witness:  'Witness',
  digital:  'Digital (email, text, screenshot)',
  physical: 'Physical Object',
  other:    'Other',
};

export const JURISDICTIONS: string[] = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado',
  'Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho',
  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
  'Maine','Maryland','Massachusetts','Michigan','Minnesota',
  'Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York',
  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
  'Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington',
  'West Virginia','Wisconsin','Wyoming',
  'District of Columbia','Puerto Rico','US Virgin Islands','Federal',
];

/** Returns true if this missing_context warning is a hard blocker (jurisdiction/claim_type). */
export function isCriticalWarning(warning: string): boolean {
  const lower = warning.toLowerCase();
  return (
    lower.includes('jurisdiction') ||
    lower.includes('claim_type') ||
    lower.includes('claim type')
  );
}
