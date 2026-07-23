import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { History, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';

export default function HistoryPage() {
  return (
    <>
      <Head>
        <title>Practice History — Opposing-Argument Simulator</title>
        <meta name="description" content="Review your past practice session history." />
      </Head>
      <AppShell title="Practice History" description="Past practice sessions">
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <History className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-ink-700">No practice history yet</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Your completed practice sessions will be listed here. Persistent history storage
              is coming in a future release.
            </p>
            <Link href="/intake?step=1" className="btn-primary mt-5 text-sm">
              <Plus className="h-4 w-4" /> Start a new case
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    </>
  );
}
