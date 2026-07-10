import React, { useState } from 'react';
import { DISCLAIMER_FULL } from '@/constants/legalNotices';

interface DisclaimerOverlayProps {
  onAccept: () => void;
}

/**
 * Full-screen disclaimer overlay that must be acknowledged before the user
 * can access the simulation. Non-dismissible without explicit acceptance.
 * Milestone 5 will populate the complete legal disclaimer text.
 */
export default function DisclaimerOverlay({ onAccept }: DisclaimerOverlayProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-body"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-sm"
    >
      <div className="bg-navy-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 max-w-lg w-full animate-fade-in">

        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 rounded-t-2xl px-6 py-4 flex items-center gap-3">
          <span className="text-amber-400 text-2xl" aria-hidden="true">⚖️</span>
          <div>
            <h2 id="disclaimer-title" className="text-white font-bold text-lg leading-tight">
              Important Legal Notice
            </h2>
            <p className="text-amber-400 text-xs font-medium">
              Please read before proceeding
            </p>
          </div>
        </div>

        {/* Body */}
        <div id="disclaimer-body" className="px-6 py-5 space-y-4 text-sm text-navy-300 leading-relaxed whitespace-pre-line">
          {DISCLAIMER_FULL}
        </div>

        {/* Acknowledgement checkbox */}
        <div className="px-6 pb-4">
          <label
            htmlFor="disclaimer-accept"
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              id="disclaimer-accept"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-navy-500 bg-navy-800 text-gold-500 cursor-pointer focus:ring-gold-500 focus:ring-offset-navy-900"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              aria-required="true"
            />
            <span className="text-sm text-navy-300 group-hover:text-navy-100 transition-colors">
              I understand this is an <strong>educational simulation</strong>, not legal advice,
              and I will consult a qualified attorney for any actual legal matter.
            </span>
          </label>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            type="button"
            id="disclaimer-proceed"
            onClick={onAccept}
            disabled={!checked}
            className="btn-primary w-full"
            aria-disabled={!checked}
          >
            I Understand — Proceed to Simulation
          </button>
          {!checked && (
            <p className="text-navy-400 text-xs text-center mt-2">
              Please check the box above to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
