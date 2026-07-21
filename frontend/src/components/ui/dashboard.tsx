// =============================================================================
// pages/dashboard.tsx
// First real screen. Proves AppShell + SidebarNav + Card + Button + StatusChip
// work together. Case list currently reads from nothing (your backend has no
// persistence layer per NFR-3 — cases live in browser session only), so this
// reads from SessionContext.structuredCase as a single "current case" tile
// plus an empty state, matching what actually exists today. When/if you add
// multi-case persistence, swap the mock array for a real fetch.
// =============================================================================

import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/badges';
import { useSession } from '@/context/SessionContext';
import { Plus, FolderOpen, ArrowRight, Scale } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { structuredCase } = useSession();

  const hasActiveCase = !!structuredCase;

  return (
    <>
      <Head>
        <title>Dashboard – Opposing Counsel Simulator</title>
      </Head>

      <AppShell
        title="Dashboard"
        description="Prepare and practice your case before your hearing."
        actions={
          <Button variant="primary" size="md" onClick={() => router.push('/intake?step=1')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New case
          </Button>
        }
      >
        {/* Quick stats row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Active case" value={hasActiveCase ? '1' : '0'} />
          <StatTile
            label="Claim type"
            value={hasActiveCase ? String(structuredCase!.claim_type).replace('_', ' ') : '—'}
          />
          <StatTile
            label="Jurisdiction"
            value={hasActiveCase ? structuredCase!.jurisdiction : '—'}
          />
        </div>

        {/* Case list / empty state */}
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your cases
        </h2>

        {hasActiveCase ? (
          <Card interactive onClick={() => router.push('/simulation')} className="max-w-xl">
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-md font-semibold text-ink-800">
                    {structuredCase!.parties.find((p) => p.role === 'plaintiff')?.name || 'You'}
                    {' v. '}
                    {structuredCase!.parties.find((p) => p.role === 'defendant')?.name || 'Opposing party'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {structuredCase!.jurisdiction} · Case {structuredCase!.case_id}
                  </p>
                </div>
                <StatusChip status="in_progress" />
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brass-600">
                Continue practicing
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyDashboardState onStart={() => router.push('/intake?step=1')} />
        )}
      </AppShell>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 truncate font-display text-lg font-semibold capitalize text-ink-800">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyDashboardState({ onStart }: { onStart: () => void }) {
  return (
    <Card className="max-w-xl">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <FolderOpen className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-md font-semibold text-ink-800">No case yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Start a new case to describe your dispute and generate a structured summary
            the simulator can practice against.
          </p>
        </div>
        <Button variant="primary" onClick={onStart} className="mt-1">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Start your case
        </Button>
      </CardContent>
    </Card>
  );
}
