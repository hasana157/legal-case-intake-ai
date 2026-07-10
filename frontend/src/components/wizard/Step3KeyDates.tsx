// =============================================================================
// frontend/src/components/wizard/Step3KeyDates.tsx
// Step 3 — Key Dates
// Dynamic list of label + date pairs. At least one key date is required before
// "Next" is enabled (critical for statute-of-limitations checks downstream).
// =============================================================================

import React, { useState } from 'react';
import type { RawIntake, KeyDate } from '@/types/intake_v2';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
}

const COMMON_LABELS = [
  'Incident date',
  'Contract signed',
  'Notice sent',
  'Filing date',
  'Termination date',
  'Move-in date',
  'Move-out date',
  'Other',
];

const EMPTY_DATE: KeyDate = { label: '', date: '' };

export default function Step3KeyDates({ formData, updateFormData, onNext, onBack }: Props) {
  const [localDates, setLocalDates] = useState<KeyDate[]>(
    formData.key_dates.length > 0 ? formData.key_dates : [{ ...EMPTY_DATE }],
  );
  const [errors,  setErrors]  = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  function updateDate(index: number, field: keyof KeyDate, value: string) {
    const updated = localDates.map((d, i) =>
      i === index ? { ...d, [field]: value } : d,
    );
    setLocalDates(updated);
    syncToForm(updated);
    if (touched) validate(updated);
  }

  function addDate() {
    setLocalDates(prev => [...prev, { ...EMPTY_DATE }]);
  }

  function removeDate(index: number) {
    const updated = localDates.filter((_, i) => i !== index);
    const newDates = updated.length === 0 ? [{ ...EMPTY_DATE }] : updated;
    setLocalDates(newDates);
    syncToForm(newDates);
    if (touched) validate(newDates);
  }

  function syncToForm(dates: KeyDate[]) {
    updateFormData(
      'key_dates',
      dates.filter(d => d.label.trim() && d.date.trim()),
    );
  }

  function validate(dates: KeyDate[]): boolean {
    const errs: string[] = [];
    const valid = dates.filter(d => d.label.trim() && d.date.trim());
    if (valid.length === 0) {
      errs.push(
        'At least one key date is required. Without a date, statute of limitations ' +
        'and other time-sensitive checks cannot be performed.',
      );
    }
    // Check for empty-half entries (label but no date, or vice versa)
    dates.forEach((d, i) => {
      if (d.label.trim() && !d.date.trim()) {
        errs.push(`Date #${i + 1}: label provided but date is missing.`);
      }
      if (!d.label.trim() && d.date.trim()) {
        errs.push(`Date #${i + 1}: date provided but label is missing.`);
      }
    });
    setErrors(errs);
    return errs.length === 0;
  }

  function handleNext() {
    setTouched(true);
    if (validate(localDates)) {
      syncToForm(localDates);
      onNext();
    }
  }

  const validCount = localDates.filter(d => d.label.trim() && d.date.trim()).length;

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-navy-300 text-sm mb-4 leading-relaxed">
          Add all important dates related to your dispute. At minimum, include the date
          the incident or breach occurred — this is essential for checking time limits.
        </p>

        {/* Date rows */}
        <div className="space-y-3" role="list" aria-label="Key dates list">
          {localDates.map((kd, index) => (
            <div
              key={index}
              role="listitem"
              className="flex flex-col sm:flex-row gap-3 p-4 bg-navy-800/50 rounded-lg border border-navy-700/50"
            >
              <div className="flex-1">
                <label htmlFor={`date-label-${index}`} className="form-label">
                  Label <span className="text-red-400">*</span>
                </label>
                <select
                  id={`date-label-${index}`}
                  className="form-select"
                  value={COMMON_LABELS.includes(kd.label) ? kd.label : (kd.label ? 'Other' : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Other' || val === '') {
                      updateDate(index, 'label', '');
                    } else {
                      updateDate(index, 'label', val);
                    }
                  }}
                >
                  <option value="">— Select or type below —</option>
                  {COMMON_LABELS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                {(!COMMON_LABELS.includes(kd.label) || kd.label === '') && (
                  <input
                    type="text"
                    className="form-input mt-2"
                    placeholder="e.g. Date of eviction notice"
                    value={kd.label === 'Other' ? '' : kd.label}
                    onChange={e => updateDate(index, 'label', e.target.value)}
                    aria-label={`Custom label for date ${index + 1}`}
                  />
                )}
              </div>
              <div className="sm:w-48">
                <label htmlFor={`date-value-${index}`} className="form-label">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  id={`date-value-${index}`}
                  type="date"
                  className="form-input"
                  value={kd.date}
                  onChange={e => updateDate(index, 'date', e.target.value)}
                  aria-required="true"
                />
              </div>
              {localDates.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove date ${index + 1}`}
                  onClick={() => removeDate(index)}
                  className="self-end sm:self-auto sm:mt-7 text-red-400 hover:text-red-300
                             p-2 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add date button */}
        <button
          type="button"
          id="add-date"
          onClick={addDate}
          className="mt-3 btn-secondary text-sm"
        >
          + Add Another Date
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

      {/* Summary */}
      {validCount > 0 && (
        <p className="text-navy-400 text-xs">
          {validCount} {validCount === 1 ? 'date' : 'dates'} entered
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="btn-secondary" id="step3-back">
          ← Back
        </button>
        <button type="button" onClick={handleNext} className="btn-primary" id="step3-next">
          Next: Narrative →
        </button>
      </div>
    </div>
  );
}
