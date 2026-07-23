import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';

export default function SavedCasesPage() {
  return (
    <>
      <Head>
        <title>Saved Cases — Opposing-Argument Simulator</title>
        <meta name="description" content="Browse and resume your saved practice cases." />
      </Head>
      <AppShell
        title="Saved Cases"
        description="Your saved practice sessions"
        actions={
          <Link href="/intake?step=1" className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> New case
          </Link>
        }
      >
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FolderOpen className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-ink-700">No saved cases yet</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Completed sessions will appear here. Persistent storage is coming in a future release.
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
