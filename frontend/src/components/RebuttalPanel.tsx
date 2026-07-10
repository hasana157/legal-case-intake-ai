import React, { useState } from 'react';
import type { RebuttalEntry } from '@/types';

interface RebuttalPanelProps {
  argumentId:  string;
  argumentHeading: string;
  onSave: (entry: RebuttalEntry) => void;
}

const MAX_CHARS = 2000;

export default function RebuttalPanel({
  argumentId,
  argumentHeading,
  onSave,
}: RebuttalPanelProps) {
  const [text,   setText]   = useState('');
  const [saved,  setSaved]  = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  function handleSave() {
    if (!text.trim()) return;
    const entry: RebuttalEntry = {
      argument_id:   argumentId,
      rebuttal_text: text.trim(),
      created_at:    new Date().toISOString(),
      last_updated:  new Date().toISOString(),
    };
    onSave(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const remaining = MAX_CHARS - text.length;

  return (
    <div className="mt-3">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn-secondary text-xs py-1.5 px-3"
          aria-expanded="false"
          aria-controls={`rebuttal-panel-${argumentId}`}
        >
          ✏️ Prepare rebuttal
        </button>
      ) : (
        <div
          id={`rebuttal-panel-${argumentId}`}
          className="bg-navy-800/60 border border-navy-600 rounded-xl p-4 animate-fade-in"
          role="region"
          aria-label={`Rebuttal for: ${argumentHeading}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-navy-200 text-sm font-semibold">Your Rebuttal</h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-navy-400 hover:text-white text-xs transition-colors"
              aria-label="Close rebuttal panel"
            >
              ✕ Close
            </button>
          </div>

          <textarea
            id={`rebuttal-text-${argumentId}`}
            className="form-textarea text-xs min-h-[100px] w-full"
            placeholder="Type your counter-argument here. Think about: what facts does this argument ignore? What law applies differently? What evidence refutes this?"
            value={text}
            onChange={e => {
              if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
            }}
            aria-label="Rebuttal text"
            maxLength={MAX_CHARS}
          />

          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${remaining < 100 ? 'text-amber-400' : 'text-navy-400'}`}>
              {remaining} chars remaining
            </span>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-green-400 text-xs animate-fade-in">
                  ✓ Saved locally
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!text.trim()}
                className="btn-primary text-xs py-1.5 px-4"
                aria-label="Save rebuttal note"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
