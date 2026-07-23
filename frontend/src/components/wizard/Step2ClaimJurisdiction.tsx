// =============================================================================
// frontend/src/components/wizard/Step2ClaimJurisdiction.tsx
// Step 2 — Claim Type & Jurisdiction
// Both fields are required dropdowns (not free text) to prevent typos that
// would break retrieval in Milestone 3.
// =============================================================================

import React, { useState } from 'react';
import type { RawIntake, ClaimType } from '@/types/intake_v2';
import { CLAIM_TYPE_LABELS, JURISDICTIONS } from '@/types/intake_v2';
import { Alert } from '@/components/ui/alert';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
}

const CLAIM_OPTIONS = (Object.entries(CLAIM_TYPE_LABELS) as [ClaimType, string][]).map(
  ([value, label]) => ({ value, label }),
);

interface FormErrors {
  claim_type?:   string;
  jurisdiction?: string;
}

export default function Step2ClaimJurisdiction({ formData, updateFormData, onNext, onBack }: Props) {
  const [claimType,    setClaimType]    = useState<ClaimType>(formData.claim_type);
  const [jurisdiction, setJurisdiction] = useState<string>(formData.jurisdiction);
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [touched,      setTouched]      = useState(false);

  function validate(ct: ClaimType, jur: string): FormErrors {
    const errs: FormErrors = {};
    if (!ct)  errs.claim_type   = 'Please select a claim type.';
    if (!jur) errs.jurisdiction = 'Please select a jurisdiction.';
    return errs;
  }

  function handleClaimChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as ClaimType;
    setClaimType(val);
    updateFormData('claim_type', val);
    if (touched) setErrors(prev => ({ ...prev, claim_type: val ? undefined : 'Please select a claim type.' }));
  }

  function handleJurisdictionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setJurisdiction(val);
    updateFormData('jurisdiction', val);
    if (touched) setErrors(prev => ({ ...prev, jurisdiction: val ? undefined : 'Please select a jurisdiction.' }));
  }

  function handleNext() {
    setTouched(true);
    const errs = validate(claimType, jurisdiction);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onNext();
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-6">
        <p className="text-slate-500 text-sm leading-relaxed">
          Select the category that best describes your dispute, and the US state
          (or Federal) where the case will be filed. These are required to retrieve
          relevant case law in later steps.
        </p>

        {/* Claim Type */}
        <div>
          <label htmlFor="claim_type" className="form-label">
            Claim Type <span className="text-signal-danger">*</span>
          </label>
          <select
            id="claim_type"
            name="claim_type"
            className={`form-select ${errors.claim_type ? 'border-signal-danger' : ''}`}
            value={claimType}
            onChange={handleClaimChange}
            aria-required="true"
            aria-invalid={!!errors.claim_type}
            aria-describedby={errors.claim_type ? 'error-claim_type' : undefined}
          >
            <option value="">— Select claim type —</option>
            {CLAIM_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.claim_type && (
            <p id="error-claim_type" className="mt-1.5 text-xs text-signal-danger" role="alert">
              ⚠ {errors.claim_type}
            </p>
          )}

          {/* Claim type description hint */}
          {claimType && (
            <p className="mt-2 text-slate-400 text-xs">
              {claimType === 'small_claims'    && 'Disputes under your state\'s small claims limit — typically $5,000–$12,500.'}
              {claimType === 'tenancy'          && 'Disputes between landlords and tenants (e.g. deposit, eviction, repairs).'}
              {claimType === 'family'           && 'Divorce, custody, child support, domestic violence, or similar family matters.'}
              {claimType === 'contract'         && 'Breach of contract, non-payment, or failure to perform agreed services.'}
              {claimType === 'employment'       && 'Wrongful termination, discrimination, harassment, or wage disputes.'}
              {claimType === 'personal_injury'  && 'Negligence causing physical injury — slip and fall, car accident, medical malpractice.'}
              {claimType === 'property'         && 'Boundary disputes, easements, zoning issues, or damage to property.'}
              {claimType === 'other'            && 'Any civil dispute not covered by the categories above.'}
            </p>
          )}
        </div>

        {/* Jurisdiction */}
        <div>
          <label htmlFor="jurisdiction" className="form-label">
            Jurisdiction (US State or Federal) <span className="text-signal-danger">*</span>
          </label>
          <select
            id="jurisdiction"
            name="jurisdiction"
            className={`form-select ${errors.jurisdiction ? 'border-signal-danger' : ''}`}
            value={jurisdiction}
            onChange={handleJurisdictionChange}
            aria-required="true"
            aria-invalid={!!errors.jurisdiction}
            aria-describedby={errors.jurisdiction ? 'error-jurisdiction' : 'jurisdiction-hint'}
          >
            <option value="">— Select jurisdiction —</option>
            {JURISDICTIONS.map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
          {errors.jurisdiction ? (
            <p id="error-jurisdiction" className="mt-1.5 text-xs text-signal-danger" role="alert">
              ⚠ {errors.jurisdiction}
            </p>
          ) : (
            <p id="jurisdiction-hint" className="mt-1.5 text-slate-400 text-xs">
              Select the state where the incident occurred or where you plan to file.
              This determines which case law is used for argument retrieval.
            </p>
          )}
        </div>

        {/* Warning: jurisdiction is a hard gate */}
        <Alert variant="info">
          <strong>Required for retrieval:</strong> Jurisdiction must be selected from the dropdown.
          Free-text entries are not accepted here — the case cannot proceed to simulation
          without a valid jurisdiction.
        </Alert>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="btn-secondary" id="step2-back">
          ← Back
        </button>
        <button type="button" onClick={handleNext} className="btn-primary" id="step2-next">
          Next: Key Dates →
        </button>
      </div>
    </div>
  );
}
