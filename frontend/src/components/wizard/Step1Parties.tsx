// =============================================================================
// frontend/src/components/wizard/Step1Parties.tsx
// Step 1 — Parties & Roles
// Users add/remove named parties and assign each a role (plaintiff/defendant/
// third_party). At least one party is required before "Next" is enabled.
// =============================================================================

import React, { useState } from 'react';
import type { RawIntake, Party, PartyRole } from '@/types/intake_v2';
import { PARTY_ROLE_LABELS } from '@/types/intake_v2';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
}

const ROLE_OPTIONS: { value: PartyRole; label: string }[] = [
  { value: 'plaintiff',   label: PARTY_ROLE_LABELS.plaintiff   },
  { value: 'defendant',   label: PARTY_ROLE_LABELS.defendant   },
  { value: 'third_party', label: PARTY_ROLE_LABELS.third_party },
];

const EMPTY_PARTY: Party = { name: '', role: 'plaintiff' };

export default function Step1Parties({ formData, updateFormData, onNext }: Props) {
  const [localParties, setLocalParties] = useState<Party[]>(
    formData.parties.length > 0 ? formData.parties : [{ name: '', role: 'plaintiff' }],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  function updateParty(index: number, field: keyof Party, value: string) {
    const updated = localParties.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    setLocalParties(updated);
    updateFormData('parties', updated.filter(p => p.name.trim()));
    if (touched) validate(updated);
  }

  function addParty() {
    setLocalParties(prev => [...prev, { ...EMPTY_PARTY }]);
  }

  function removeParty(index: number) {
    const updated = localParties.filter((_, i) => i !== index);
    setLocalParties(updated.length === 0 ? [{ ...EMPTY_PARTY }] : updated);
    updateFormData('parties', updated.filter(p => p.name.trim()));
    if (touched) validate(updated);
  }

  function validate(parties: Party[]): boolean {
    const errs: string[] = [];
    const named = parties.filter(p => p.name.trim());
    if (named.length === 0) {
      errs.push('At least one party with a name is required.');
    }
    const hasPlaintiff = named.some(p => p.role === 'plaintiff');
    if (!hasPlaintiff) errs.push('At least one plaintiff is required.');
    const hasDefendant = named.some(p => p.role === 'defendant');
    if (!hasDefendant) errs.push('At least one defendant is required.');
    setErrors(errs);
    return errs.length === 0;
  }

  function handleNext() {
    setTouched(true);
    if (validate(localParties)) {
      updateFormData('parties', localParties.filter(p => p.name.trim()));
      onNext();
    }
  }

  const namedCount = localParties.filter(p => p.name.trim()).length;

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-navy-300 text-sm mb-4 leading-relaxed">
          Add all parties involved in your dispute. You need at least one plaintiff
          (typically yourself) and one defendant (the opposing party).
        </p>

        {/* Party rows */}
        <div className="space-y-3" role="list" aria-label="Party list">
          {localParties.map((party, index) => (
            <div
              key={index}
              role="listitem"
              className="flex flex-col sm:flex-row gap-3 p-4 bg-navy-800/50 rounded-lg border border-navy-700/50"
            >
              <div className="flex-1">
                <label
                  htmlFor={`party-name-${index}`}
                  className="form-label"
                >
                  Full Name / Entity Name <span className="text-red-400">*</span>
                </label>
                <input
                  id={`party-name-${index}`}
                  type="text"
                  className="form-input"
                  placeholder={index === 0 ? 'e.g. Jane Smith (your name)' : 'e.g. Acme Corporation'}
                  value={party.name}
                  onChange={e => updateParty(index, 'name', e.target.value)}
                  aria-required="true"
                />
              </div>
              <div className="sm:w-52">
                <label
                  htmlFor={`party-role-${index}`}
                  className="form-label"
                >
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  id={`party-role-${index}`}
                  className="form-select"
                  value={party.role}
                  onChange={e => updateParty(index, 'role', e.target.value as PartyRole)}
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {localParties.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove party ${index + 1}`}
                  onClick={() => removeParty(index)}
                  className="self-end sm:self-auto sm:mt-7 text-red-400 hover:text-red-300 
                             p-2 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add party button */}
        <button
          type="button"
          id="add-party"
          onClick={addParty}
          className="mt-3 btn-secondary text-sm"
        >
          + Add Another Party
        </button>

        {/* Validation errors */}
        {touched && errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg" role="alert">
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="text-red-400 text-sm flex items-start gap-2">
                  <span aria-hidden="true">⚠</span> {err}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Parties summary */}
      {namedCount > 0 && (
        <p className="text-navy-400 text-xs">
          {namedCount} {namedCount === 1 ? 'party' : 'parties'} added
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          type="button"
          id="step1-next"
          onClick={handleNext}
          className="btn-primary"
        >
          Next: Claim & Jurisdiction →
        </button>
      </div>
    </div>
  );
}
