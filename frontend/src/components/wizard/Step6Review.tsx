// =============================================================================
// frontend/src/components/wizard/Step6Review.tsx
// Step 6 — Review & Submit
// Read-only summary of all entered data before final submission.
// =============================================================================

import React from 'react';
import type { RawIntake } from '@/types/intake_v2';
import {
  CLAIM_TYPE_LABELS,
  PARTY_ROLE_LABELS,
  EVIDENCE_TYPE_LABELS,
} from '@/types/intake_v2';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
  onSubmit:       () => Promise<void>;
  isLoading:      boolean;
}

export default function Step6Review({ formData, onBack, onSubmit, isLoading }: Props) {
  const wordCount = formData.narrative.trim()
    ? formData.narrative.trim().split(/\s+/).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="card space-y-6">
        <p className="text-navy-300 text-sm leading-relaxed">
          Review all the information you have entered. Click <strong className="text-white">&quot;Submit for Analysis&quot;</strong> when
          you are satisfied, or go back to any step to make changes.
        </p>

        {/* ── Parties ──────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <span className="text-gold-400" aria-hidden="true">👥</span> Parties
            </h3>
            <span className="text-navy-400 text-xs">{formData.parties.length} listed</span>
          </div>
          {formData.parties.length > 0 ? (
            <div className="space-y-2">
              {formData.parties.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-navy-800/50 rounded-lg border border-navy-700/30"
                >
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.role === 'plaintiff'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : p.role === 'defendant'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-navy-600/30 text-navy-300 border border-navy-500/30'
                  }`}>
                    {PARTY_ROLE_LABELS[p.role].split(' ')[0]}
                  </span>
                  <span className="text-white text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-amber-400 text-sm">⚠ No parties entered</p>
          )}
        </section>

        <hr className="border-navy-700" />

        {/* ── Claim & Jurisdiction ──────────────────────────────────────────── */}
        <section>
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <span className="text-gold-400" aria-hidden="true">⚖️</span> Claim & Jurisdiction
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="px-3 py-2 bg-navy-800/50 rounded-lg border border-navy-700/30">
              <p className="text-navy-400 text-xs mb-1">Claim Type</p>
              <p className="text-white text-sm font-medium">
                {CLAIM_TYPE_LABELS[formData.claim_type] || formData.claim_type}
              </p>
            </div>
            <div className="px-3 py-2 bg-navy-800/50 rounded-lg border border-navy-700/30">
              <p className="text-navy-400 text-xs mb-1">Jurisdiction</p>
              <p className="text-white text-sm font-medium">{formData.jurisdiction || '—'}</p>
            </div>
          </div>
        </section>

        <hr className="border-navy-700" />

        {/* ── Key Dates ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <span className="text-gold-400" aria-hidden="true">📅</span> Key Dates
            </h3>
            <span className="text-navy-400 text-xs">{formData.key_dates.length} listed</span>
          </div>
          {formData.key_dates.length > 0 ? (
            <div className="space-y-2">
              {formData.key_dates.map((kd, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-navy-800/50 rounded-lg border border-navy-700/30"
                >
                  <span className="text-white text-sm">{kd.label}</span>
                  <span className="text-gold-400 text-sm font-mono">{kd.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-amber-400 text-sm">
              ⚠ No key dates — statute of limitations cannot be checked
            </p>
          )}
        </section>

        <hr className="border-navy-700" />

        {/* ── Narrative Preview ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <span className="text-gold-400" aria-hidden="true">📝</span> Narrative
            </h3>
            <span className="text-navy-400 text-xs">
              {formData.narrative.trim().length} chars · {wordCount.toLocaleString()} words
            </span>
          </div>
          <div className="px-4 py-3 bg-navy-800/50 rounded-lg border border-navy-700/30 max-h-40 overflow-y-auto">
            <p className="text-navy-200 text-sm whitespace-pre-wrap leading-relaxed">
              {formData.narrative.trim().length > 500
                ? formData.narrative.trim().slice(0, 500) + '…'
                : formData.narrative.trim()
              }
            </p>
          </div>
          {wordCount > 5000 && (
            <p className="mt-2 text-amber-400 text-xs">
              ⚠ Long narrative ({wordCount.toLocaleString()} words) — server will use chunked extraction
            </p>
          )}
        </section>

        <hr className="border-navy-700" />

        {/* ── Evidence ──────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <span className="text-gold-400" aria-hidden="true">📎</span> Evidence
            </h3>
            <span className="text-navy-400 text-xs">{formData.evidence.length} items</span>
          </div>
          {formData.evidence.length > 0 ? (
            <div className="space-y-2">
              {formData.evidence.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-navy-800/50 rounded-lg border border-navy-700/30"
                >
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-navy-600/30 text-navy-300 border border-navy-500/30">
                    {EVIDENCE_TYPE_LABELS[ev.type]}
                  </span>
                  <span className="text-white text-sm">{ev.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-navy-400 text-sm italic">No evidence items listed (optional)</p>
          )}
        </section>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-amber-300 text-xs leading-relaxed">
          <strong>⚖️ Educational simulation only.</strong> By submitting, your case
          narrative will be processed by an AI extraction engine. The structured output
          is used for educational opposing-argument simulation only — it does not
          constitute legal advice or create an attorney-client relationship.
        </p>
      </div>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
          id="step6-back"
          disabled={isLoading}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="btn-primary min-w-[200px]"
          id="submit-intake"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Analysing…
            </>
          ) : (
            '🔍 Submit for Analysis'
          )}
        </button>
      </div>
    </div>
  );
}
