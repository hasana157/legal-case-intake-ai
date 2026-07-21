// =============================================================================
// components/ui/skeleton.tsx
// Replaces the spinner-only loading overlays in intake.tsx and the "Waiting
// for first token..." text placeholder in StreamingArgumentDisplay.tsx.
// A skeleton that mirrors the shape of what's coming (a card, a table row,
// a line of text) reads as faster and more intentional than a spinner,
// and is the standard in Notion/Linear-class products.
// =============================================================================

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-skeleton rounded bg-slate-200 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Mirrors the shape of an ArgumentCard while a turn is streaming/loading. */
export function ArgumentCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-3.5 w-full" />
      <Skeleton className="mb-2 h-3.5 w-11/12" />
      <Skeleton className="mb-4 h-3.5 w-3/4" />
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-28 rounded" />
        <Skeleton className="h-6 w-24 rounded" />
      </div>
    </div>
  );
}

/** For Dashboard / Saved Cases while the case list is loading. */
export function CaseCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <Skeleton className="mb-2 h-4 w-2/3" />
      <Skeleton className="mb-3 h-3 w-1/3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** For Table-backed screens (Practice History, Saved Cases) row loading. */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3.5 w-full" />
        </td>
      ))}
    </tr>
  );
}
