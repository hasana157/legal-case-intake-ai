// =============================================================================
// frontend/src/components/wizard/Step4Narrative.tsx
// Step 4 — Free-text Narrative
// Minimum 50 characters required. Shows live word/char counts and warns
// when narrative exceeds 5,000 words (chunking will be used server-side).
// =============================================================================

import React, { useState } from 'react';
import type { RawIntake } from '@/types/intake_v2';
import { Alert } from '@/components/ui/alert';

interface Props {
  formData:       RawIntake;
  updateFormData: <K extends keyof RawIntake>(key: K, value: RawIntake[K]) => void;
  onNext:         () => void;
  onBack:         () => void;
}

const MIN_CHARS = 50;
const LONG_NARRATIVE_WORDS = 5000;

export default function Step4Narrative({ formData, updateFormData, onNext, onBack }: Props) {
  const [text,    setText]    = useState<string>(formData.narrative);
  const [error,   setError]   = useState<string>('');
  const [touched, setTouched] = useState(false);

  const charCount = text.trim().length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isLong    = wordCount > LONG_NARRATIVE_WORDS;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    updateFormData('narrative', val);
    if (touched) validate(val);
  }

  function validate(val: string): boolean {
    const trimmed = val.trim();
    if (!trimmed) {
      setError('Please describe what happened. The narrative cannot be empty.');
      return false;
    }
    if (trimmed.length < MIN_CHARS) {
      setError(`Please provide at least ${MIN_CHARS} characters (currently ${trimmed.length}).`);
      return false;
    }
    setError('');
    return true;
  }

  function handleNext() {
    setTouched(true);
    if (validate(text)) {
      updateFormData('narrative', text);
      onNext();
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          Describe what happened in your own words. Include relevant dates, events,
          communications, agreements, and anything the other party said or did.
          The more detail you provide, the better the analysis will be.
        </p>

        {/* Tips */}
        <div className="mb-4 p-3 bg-brass-50 border border-brass-200 rounded-lg">
          <p className="text-ink-800 text-xs font-semibold mb-2">💡 Tips for a strong narrative:</p>
          <ul className="space-y-1 text-ink-700 text-xs list-disc list-inside">
            <li>Start from the beginning — when did the relationship or agreement start?</li>
            <li>Describe what was agreed or expected</li>
            <li>Explain what went wrong and when</li>
            <li>Mention any communication you had about the problem</li>
            <li>Note any evidence you have (documents, photos, messages)</li>
            <li>State what you are asking for (refund, repair, damages, etc.)</li>
          </ul>
        </div>

        {/* Textarea */}
        <div>
          <label htmlFor="narrative" className="form-label">
            Your Story <span className="text-signal-danger">*</span>
            <span className="ml-2 text-slate-400 font-normal">(minimum {MIN_CHARS} characters)</span>
          </label>
          <textarea
            id="narrative"
            name="narrative"
            className={`form-textarea min-h-[200px] ${error ? 'border-signal-danger' : ''}`}
            rows={10}
            placeholder="On [date], I [entered into an agreement / rented a property / was injured / etc.]. The other party agreed to [describe what was promised]. However, [describe what went wrong]..."
            value={text}
            onChange={handleChange}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'error-narrative' : 'narrative-counts'}
          />

          {/* Counts and error */}
          <div className="flex items-center justify-between mt-2 gap-4">
            {error ? (
              <p id="error-narrative" className="text-xs text-signal-danger" role="alert">
                ⚠ {error}
              </p>
            ) : (
              <span className="text-xs text-slate-400" />
            )}
            <div id="narrative-counts" className="text-xs text-right flex-shrink-0 space-x-3">
              <span className={charCount < MIN_CHARS ? 'text-signal-warning' : 'text-slate-400'}>
                {charCount} chars
              </span>
              <span className={isLong ? 'text-signal-warning' : 'text-slate-400'}>
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>
        </div>

        {/* Long narrative warning */}
        {isLong && (
          <Alert variant="warning" className="mt-4">
            <strong>Long narrative detected ({wordCount.toLocaleString()} words):</strong> The server will automatically split it into overlapping chunks for extraction. This ensures accurate fact structuring.
          </Alert>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="btn-secondary" id="step4-back">
          ← Back
        </button>
        <button type="button" onClick={handleNext} className="btn-primary" id="step4-next">
          Next: Evidence →
        </button>
      </div>
    </div>
  );
}
