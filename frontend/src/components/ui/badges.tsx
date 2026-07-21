// =============================================================================
// components/ui/badges.tsx
// The small, reused vocabulary of the whole app. Every argument, citation,
// and case-status surface in the product routes through one of these four
// components — that repetition is what makes the UI feel like a coherent
// system instead of a stack of one-off screens.
// =============================================================================

import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, type LucideIcon } from 'lucide-react';

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ── ConfidenceBadge ───────────────────────────────────────────────────────────
// Shows model confidence for a generated argument. Deliberately text-forward
// (High/Medium/Low), not just a color dot — self-represented users shouldn't
// have to learn a color code to understand how much to trust a claim.

type Confidence = 'High' | 'Medium' | 'Low';

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  High:   'bg-signal-successSoft text-signal-success border-signal-success/25',
  Medium: 'bg-signal-warningSoft text-signal-warning border-signal-warning/25',
  Low:    'bg-signal-dangerSoft text-signal-danger border-signal-danger/25',
};

export function ConfidenceBadge({ level, className }: { level: Confidence; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-xs font-medium tracking-wide',
        CONFIDENCE_STYLES[level],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {level} confidence
    </span>
  );
}

// ── VerificationTag ───────────────────────────────────────────────────────────
// Maps directly to the backend's citation_verifier.py output (auth.unverified).
// This is the most legally-load-bearing badge in the app: it tells the user
// whether a citation is provably grounded in retrieved case law, or a model
// claim that couldn't be matched. Never soften this into decoration.

export function VerificationTag({ verified, className }: { verified: boolean; className?: string }) {
  const Icon: LucideIcon = verified ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wider',
        verified
          ? 'bg-signal-successSoft text-signal-success'
          : 'bg-signal-dangerSoft text-signal-danger',
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

// ── CitationBadge ─────────────────────────────────────────────────────────────
// A clickable pill for a case citation. Monospace type signals "this is a
// precise legal reference, not prose" — same convention as a docket number.

export function CitationBadge({
  citation,
  verified,
  onClick,
  className,
}: {
  citation: string;
  verified?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded border px-2 py-1',
        'font-mono text-xs',
        verified === false
          ? 'border-signal-danger/30 bg-signal-dangerSoft text-signal-danger line-through decoration-1'
          : 'border-slate-200 bg-slate-50 text-ink-700 hover:border-brass-400 hover:bg-brass-50',
        onClick && 'cursor-pointer transition-colors',
        className,
      )}
      title={citation}
    >
      <span className="truncate">{citation}</span>
    </Comp>
  );
}

// ── StatusChip ─────────────────────────────────────────────────────────────
// Generic case/workflow status — used on Dashboard, Saved Cases, Practice
// History. Distinct from ConfidenceBadge (which is about an argument, not
// a case) so the two are never visually confused.

type Status = 'draft' | 'in_progress' | 'needs_review' | 'complete' | 'archived';

const STATUS_META: Record<Status, { label: string; className: string }> = {
  draft:         { label: 'Draft',         className: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress:   { label: 'In progress',   className: 'bg-signal-infoSoft text-signal-info border-signal-info/25' },
  needs_review:  { label: 'Needs review',  className: 'bg-signal-warningSoft text-signal-warning border-signal-warning/25' },
  complete:      { label: 'Complete',      className: 'bg-signal-successSoft text-signal-success border-signal-success/25' },
  archived:      { label: 'Archived',      className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

// ── GroundingScoreBadge ───────────────────────────────────────────────────
// Surfaces the backend's G_v (Grounding Verification) score directly — this
// is your project's actual scientific contribution, so it deserves its own
// primitive rather than being folded into ConfidenceBadge.

export function GroundingScoreBadge({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(score * 100);
  const tier = score >= 0.95 ? 'success' : score >= 0.8 ? 'warning' : 'danger';
  const Icon = tier === 'success' ? ShieldCheck : tier === 'warning' ? ShieldQuestion : ShieldAlert;
  const styles = {
    success: 'text-signal-success bg-signal-successSoft border-signal-success/25',
    warning: 'text-signal-warning bg-signal-warningSoft border-signal-warning/25',
    danger:  'text-signal-danger bg-signal-dangerSoft border-signal-danger/25',
  }[tier];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-semibold',
        styles,
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      G_v {pct}%
    </span>
  );
}
