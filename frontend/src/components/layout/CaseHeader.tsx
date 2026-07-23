// =============================================================================
// components/layout/CaseHeader.tsx
// Reusable case-level header: title + jurisdiction/claim metadata + right-
// aligned action buttons. Extracted from AppShell so individual pages can
// compose richer headers without coupling to the shell's generic title prop.
// =============================================================================

import React from 'react';
import { Scale } from 'lucide-react';
import { StatusChip } from '@/components/ui/badges';

type CaseStatus = 'draft' | 'in_progress' | 'needs_review' | 'complete' | 'archived';

export interface CaseHeaderProps {
  /** Primary title e.g. "Gonzalez v. Sunset Property Management" */
  title: string;
  /** Claim type label e.g. "Contract Dispute" */
  claimType?: string;
  /** Jurisdiction e.g. "California" */
  jurisdiction?: string;
  /** Optional workflow status badge */
  status?: CaseStatus;
  /** Optional right-aligned action buttons / links */
  actions?: React.ReactNode;
  className?: string;
}

export function CaseHeader({
  title,
  claimType,
  jurisdiction,
  status,
  actions,
  className = '',
}: CaseHeaderProps) {
  const hasMeta = claimType || jurisdiction || status;

  return (
    <div
      className={[
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      ].join(' ')}
    >
      {/* Left — title + meta */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Scale className="h-4 w-4 flex-shrink-0 text-brass-500" aria-hidden="true" />
          <h1 className="font-display text-xl font-semibold text-ink-800 sm:text-2xl">
            {title}
          </h1>
          {status && <StatusChip status={status} />}
        </div>

        {hasMeta && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            {claimType && <span>{claimType}</span>}
            {claimType && jurisdiction && (
              <span className="text-slate-300" aria-hidden="true">·</span>
            )}
            {jurisdiction && <span>{jurisdiction}</span>}
          </p>
        )}
      </div>

      {/* Right — actions */}
      {actions && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
