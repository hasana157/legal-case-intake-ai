// =============================================================================
// frontend/src/components/wizard/Step5Evidence.tsx
// Step 5 — Evidence List
// Optional: users can add/remove evidence items with a description and type.
// This step does NOT block navigation — evidence is encouraged but not required.
// =============================================================================

import React, { useState } from 'react';
import type { RawIntake, EvidenceItem, EvidenceType } from '@/types/intake_v2';
import { EVIDENCE_TYPE_LABELS } from '@/types/intake_v2';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
}

const TYPE_OPTIONS = (Object.entries(EVIDENCE_TYPE_LABELS) as [EvidenceType, string][]).map(
  ([value, label]) => ({ value, label }),
);

const EMPTY_EVIDENCE: EvidenceItem = { description: '', type: 'document' };

export default function Step5Evidence({ formData, updateFormData, onNext, onBack }: Props) {
  const [localEvidence, setLocalEvidence] = useState<EvidenceItem[]>(
    formData.evidence.length > 0 ? formData.evidence : [],
  );
  const [showForm, setShowForm] = useState(formData.evidence.length > 0);

  function updateItem(index: number, field: keyof EvidenceItem, value: string) {
    const updated = localEvidence.map((ev, i) =>
      i === index ? { ...ev, [field]: value } : ev,
    );
    setLocalEvidence(updated);
    updateFormData('evidence', updated.filter(e => e.description.trim()));
  }

  function addItem() {
    setShowForm(true);
    setLocalEvidence(prev => [...prev, { ...EMPTY_EVIDENCE }]);
  }

  function removeItem(index: number) {
    const updated = localEvidence.filter((_, i) => i !== index);
    setLocalEvidence(updated);
    updateFormData('evidence', updated.filter(e => e.description.trim()));
    if (updated.length === 0) setShowForm(false);
  }

  function handleNext() {
    // Filter to only valid entries before proceeding
    const valid = localEvidence.filter(e => e.description.trim());
    updateFormData('evidence', valid);
    onNext();
  }

  const validCount = localEvidence.filter(e => e.description.trim()).length;

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-navy-300 text-sm mb-4 leading-relaxed">
          List any evidence you have to support your case. This step is <strong className="text-navy-200">optional</strong> but
          helps the simulator understand the strength of your position.
        </p>

        {/* No evidence added yet — show prompt */}
        {!showForm && localEvidence.length === 0 && (
          <div className="text-center py-8">
            <p className="text-navy-400 text-sm mb-4">
              📎 Do you have any supporting documents, photos, messages, or witnesses?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={addItem}
                className="btn-primary text-sm"
                id="start-adding-evidence"
              >
                + Yes, Add Evidence
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn-secondary text-sm"
                id="skip-evidence"
              >
                Skip — No Evidence to Add
              </button>
            </div>
          </div>
        )}

        {/* Evidence items */}
        {showForm && (
          <>
            <div className="space-y-3" role="list" aria-label="Evidence list">
              {localEvidence.map((ev, index) => (
                <div
                  key={index}
                  role="listitem"
                  className="flex flex-col sm:flex-row gap-3 p-4 bg-navy-800/50 rounded-lg border border-navy-700/50"
                >
                  <div className="flex-1">
                    <label htmlFor={`evidence-desc-${index}`} className="form-label">
                      Description
                    </label>
                    <input
                      id={`evidence-desc-${index}`}
                      type="text"
                      className="form-input"
                      placeholder="e.g. Signed lease agreement dated March 2023"
                      value={ev.description}
                      onChange={e => updateItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="sm:w-52">
                    <label htmlFor={`evidence-type-${index}`} className="form-label">
                      Type
                    </label>
                    <select
                      id={`evidence-type-${index}`}
                      className="form-select"
                      value={ev.type}
                      onChange={e => updateItem(index, 'type', e.target.value as EvidenceType)}
                    >
                      {TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove evidence item ${index + 1}`}
                    onClick={() => removeItem(index)}
                    className="self-end sm:self-auto sm:mt-7 text-red-400 hover:text-red-300
                               p-2 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add more */}
            <button
              type="button"
              id="add-evidence"
              onClick={addItem}
              className="mt-3 btn-secondary text-sm"
            >
              + Add Another Item
            </button>
          </>
        )}
      </div>

      {/* Summary */}
      {validCount > 0 && (
        <p className="text-navy-400 text-xs">
          {validCount} evidence {validCount === 1 ? 'item' : 'items'} listed
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="btn-secondary" id="step5-back">
          ← Back
        </button>
        <button type="button" onClick={handleNext} className="btn-primary" id="step5-next">
          Next: Review →
        </button>
      </div>
    </div>
  );
}
