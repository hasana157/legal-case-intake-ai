import React from 'react';
import type { OpposingArgumentsResponse, OpposingArgument } from '@/types';

interface StreamingArgumentDisplayProps {
  response: OpposingArgumentsResponse;
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? 'bg-red-500/20 text-red-400 border-red-500/40' :
    pct >= 60 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-green-500/20 text-green-400 border-green-500/40';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {pct}% strength
    </span>
  );
}

function ArgumentTypeTag({ type }: { type: string }) {
  const labels: Record<string, string> = {
    procedural:  '⚙ Procedural',
    substantive: '⚖ Substantive',
    evidentiary: '📋 Evidentiary',
    damages:     '💰 Damages',
  };
  return (
    <span className="badge-milestone">
      {labels[type] ?? type}
    </span>
  );
}

function ArgumentCard({ arg, index }: { arg: OpposingArgument; index: number }) {
  return (
    <article
      className="card border-navy-700 animate-fade-in"
      aria-labelledby={`arg-heading-${arg.id}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gold-500 font-black text-lg leading-none">
            {index + 1}.
          </span>
          <ArgumentTypeTag type={arg.argument_type} />
          <ConfidenceBadge score={arg.confidence_score} />
        </div>
        <span className="badge-mock">🤖 MOCK DATA</span>
      </div>

      {/* Heading */}
      <h3
        id={`arg-heading-${arg.id}`}
        className="text-white font-bold text-base mb-3 leading-snug"
      >
        {arg.heading}
      </h3>

      {/* Body */}
      <p className="text-navy-300 text-sm leading-relaxed mb-4">
        {arg.body}
      </p>

      {/* Supporting Authorities */}
      {arg.supporting_authorities.length > 0 && (
        <div className="border-t border-navy-700 pt-4 mb-4">
          <h4 className="text-navy-200 font-semibold text-xs uppercase tracking-wider mb-3">
            Supporting Authorities
          </h4>
          <ul className="space-y-2">
            {arg.supporting_authorities.map((auth, i) => (
              <li
                key={i}
                className="bg-navy-800/60 rounded-lg px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-gold-400 font-semibold">{auth.case_name}</span>
                    <span className="text-navy-400 text-xs ml-2">{auth.citation}</span>
                  </div>
                  <span className="text-navy-400 text-xs whitespace-nowrap">
                    {Math.round(auth.relevance_score * 100)}% relevant
                  </span>
                </div>
                <p className="text-navy-300 text-xs mt-1">{auth.holding}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weakness Notes */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
        <p className="text-green-300 text-xs font-semibold mb-1">
          💡 Potential weakness to explore:
        </p>
        <p className="text-green-200/80 text-xs">{arg.weakness_notes}</p>
      </div>
    </article>
  );
}

export default function StreamingArgumentDisplay({ response }: StreamingArgumentDisplayProps) {
  return (
    <section aria-label="Opposing arguments generated">
      {/* Summary banner */}
      <div className="card-glass border-navy-600 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-lg">Opposing Arguments</h2>
            <span className="badge-mock">🤖 MOCK — Milestone 1</span>
          </div>
          <span className="badge-milestone">Case {response.case_id}</span>
        </div>
        <p className="text-navy-300 text-sm mb-3">
          <strong className="text-navy-200">Overall strategy:</strong>{' '}
          {response.overall_strategy}
        </p>
        <p className="text-amber-400/80 text-xs italic">{response.disclaimer}</p>
      </div>

      {/* Argument cards */}
      <div className="space-y-4" role="list" aria-label="Argument list">
        {response.arguments.map((arg, i) => (
          <div key={arg.id} role="listitem">
            <ArgumentCard arg={arg} index={i} />
          </div>
        ))}
      </div>

      {/* Metadata footer */}
      <div className="mt-6 text-right text-navy-500 text-xs">
        Generated: {new Date(response.generated_at).toLocaleString()}
      </div>
    </section>
  );
}
