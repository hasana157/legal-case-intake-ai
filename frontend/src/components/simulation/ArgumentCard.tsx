// =============================================================================
// components/simulation/ArgumentCard.tsx
// Replaces DialogueBubble + Avatar + speech-bubble arena from the old build.
// One card = one argument turn, regardless of which side made it. Side is
// communicated by a 3px rail + label, not by cartoon avatars or color-coded
// chat bubbles — this is the single biggest tone shift from "debate game"
// to "case file."
// =============================================================================

import React, { useState } from 'react';
import { ChevronDown, FileText, Scale } from 'lucide-react';
import { ConfidenceBadge, CitationBadge, VerificationTag } from '@/components/ui/badges';

export interface ArgumentAuthority {
  citation: string;
  unverified?: boolean;
}

export interface ArgumentCardProps {
  side: 'plaintiff' | 'opposing';
  category: 'substantive' | 'procedural' | 'evidentiary';
  claimText: string;
  confidence: 'High' | 'Medium' | 'Low';
  authorities: ArgumentAuthority[];
  reasoning?: string;      // optional expandable "why this argument was raised"
}

const CATEGORY_LABEL: Record<ArgumentCardProps['category'], string> = {
  substantive:  'Substantive',
  procedural:   'Procedural',
  evidentiary:  'Evidentiary',
};

export function ArgumentCard({
  side,
  category,
  claimText,
  confidence,
  authorities,
  reasoning,
}: ArgumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isOpposing = side === 'opposing';

  return (
    <article
      className={[
        'group relative rounded-xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1',
      ].join(' ')}
    >
      {/* side rail — the only "avatar" left in the design */}
      <div
        className={[
          'absolute inset-y-0 left-0 w-1.5 rounded-l-xl',
          isOpposing ? 'bg-gradient-to-b from-rose-400 to-rose-600' : 'bg-gradient-to-b from-blue-400 to-blue-600',
        ].join(' ')}
        aria-hidden="true"
      />

      <div className="p-5 pl-6">
        {/* header row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={[
                'text-xs font-semibold uppercase tracking-wider',
                isOpposing ? 'text-signal-danger' : 'text-signal-info',
              ].join(' ')}
            >
              {isOpposing ? 'Likely opposing position' : 'Your position'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">
              {CATEGORY_LABEL[category]}
            </span>
          </div>
          <ConfidenceBadge level={confidence} />
        </div>

        {/* claim body */}
        <p className="text-base leading-relaxed text-ink-800">{claimText}</p>

        {/* authorities */}
        {authorities.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Scale className="mr-0.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {authorities.map((auth, i) => (
              <CitationBadge key={i} citation={auth.citation} verified={!auth.unverified} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs italic text-slate-400">No authorities cited for this point.</p>
        )}

        {/* aggregate verification line */}
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <VerificationTag verified={authorities.every((a) => !a.unverified) && authorities.length > 0} />
          {reasoning && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 rounded"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Why this argument
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {expanded && reasoning && (
          <div className="mt-3 animate-fade-up rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
            {reasoning}
          </div>
        )}
      </div>
    </article>
  );
}
