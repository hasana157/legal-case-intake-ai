// =============================================================================
// pages/dashboard.tsx
// Dashboard: case list, quick stats, "New Case" CTA.
// Uses session data + placeholder for future persistent case list.
// =============================================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Plus,
  Scale,
  BarChart3,
  FolderOpen,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip, GroundingScoreBadge } from '@/components/ui/badges';
import { useSession } from '@/context/SessionContext';
import { CLAIM_TYPE_LABELS } from '@/types/intake_v2';

const pageVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
};

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const { structuredCase, simulationResult } = useSession();

  const hasActiveCase = !!structuredCase;
  const plaintiff = structuredCase?.parties.find(p => p.role === 'plaintiff')?.name;
  const defendant = structuredCase?.parties.find(p => p.role === 'defendant')?.name;

  return (
    <>
      <Head>
        <title>Dashboard — Opposing-Argument Simulator</title>
        <meta name="description" content="View your active cases and start a new practice session." />
      </Head>

      <AppShell
        title="Dashboard"
        description="Your practice sessions"
        actions={
          <Link href="/intake?step=1" className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> New case
          </Link>
        }
      >
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* ── Quick-stat row ───────────────────────────────────────────── */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-3"
          >
            {[
              {
                label: 'Active session',
                value: hasActiveCase ? '1' : '0',
                icon: Scale,
                color: 'text-brass-500',
              },
              {
                label: 'Arguments reviewed',
                value: simulationResult ? String(simulationResult.arguments.length) : '—',
                icon: BarChart3,
                color: 'text-signal-info',
              },
              {
                label: 'Grounding score',
                value: simulationResult ? `${Math.round(simulationResult.g_v_score * 100)}%` : '—',
                icon: Zap,
                color: 'text-signal-success',
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <motion.div key={label} variants={itemVariants}>
                <div className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:bg-white/70 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-3 ${color} shadow-sm`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="mt-0.5 font-display text-3xl font-bold text-slate-800">{value}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Active case ──────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 font-display text-base font-semibold text-ink-700">
              Active session
            </h2>

            {hasActiveCase ? (
              <motion.div variants={listVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Card interactive onClick={() => router.push('/simulation')}>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ink-800 text-brass-400">
                          <Scale className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-800">
                            {plaintiff && defendant
                              ? `${plaintiff} v. ${defendant}`
                              : 'Unnamed case'}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-slate-500">
                            {structuredCase
                              ? `${CLAIM_TYPE_LABELS[structuredCase.claim_type]} · ${structuredCase.jurisdiction}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        {simulationResult && (
                          <GroundingScoreBadge score={simulationResult.g_v_score} />
                        )}
                        <StatusChip status={simulationResult ? 'in_progress' : 'draft'} />
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <FolderOpen className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
                  <p className="font-semibold text-ink-700">No active session</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    Create a new case to start practising your arguments against an AI opponent.
                  </p>
                  <Link href="/intake?step=1" className="btn-primary mt-5 text-sm">
                    <Plus className="h-4 w-4" /> Start new case
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>

          {/* ── Quick links ───────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 font-display text-base font-semibold text-ink-700">
              Quick actions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: '/intake?step=1', label: 'New case', description: 'Start a fresh practice session', icon: Plus },
                { href: '/simulation',   label: 'Continue session', description: 'Return to practice arena', icon: Zap },
                { href: '/export',       label: 'Export guide', description: 'Download your rehearsal PDF', icon: BarChart3 },
              ].map(({ href, label, description, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Card interactive className="h-full">
                    <CardContent className="flex items-start gap-3 py-4">
                      <div className="rounded-md bg-brass-50 p-2 text-brass-600">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-800 text-sm">{label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </motion.div>
      </AppShell>
    </>
  );
}
