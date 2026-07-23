// =============================================================================
// pages/export.tsx
// Restyled to ink/brass design system. Wired to real session data.
// AppShell wrapper, CaseHeader, structured sections with Card primitives.
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  FileDown,
  ClipboardCopy,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { CaseHeader } from '@/components/layout/CaseHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { GroundingScoreBadge, CitationBadge, VerificationTag } from '@/components/ui/badges';
import { useSession } from '@/context/SessionContext';
import generatePdf from '@/services/pdfExport';
import { CLAIM_TYPE_LABELS } from '@/types/intake_v2';

const pageVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ExportPage() {
  const router = useRouter();
  const { structuredCase, simulationResult, rebuttals, messages, analysis, clearSession } = useSession();
  const [copied, setCopied] = useState(false);

  // ── Empty state ────────────────────────────────────────────────────────

  if (!structuredCase || !simulationResult) {
    return (
      <>
        <Head>
          <title>Export & Review — Opposing-Argument Simulator</title>
        </Head>
        <AppShell title="Export & Review">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Scale className="mb-4 h-12 w-12 text-slate-300" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-ink-800">No completed simulation yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Export becomes available after intake and opposing-argument simulation are complete.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-primary" onClick={() => router.push('/intake')}>
                Start intake
              </button>
              {structuredCase && (
                <button type="button" className="btn-secondary" onClick={() => router.push('/simulation')}>
                  Continue simulation
                </button>
              )}
            </div>
          </div>
        </AppShell>
      </>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────

  const plaintiff       = structuredCase.parties.find(p => p.role === 'plaintiff')?.name || 'Plaintiff';
  const defendant       = structuredCase.parties.find(p => p.role === 'defendant')?.name || 'Defendant';
  const totalArgs       = simulationResult.arguments.length;
  const completedRebuttals = simulationResult.arguments.filter((_, i) =>
    (rebuttals[i.toString()] || '').trim().length > 10,
  ).length;
  const preparednessScore = totalArgs > 0
    ? Math.round((completedRebuttals / totalArgs) * 6 + simulationResult.g_v_score * 4)
    : Math.round(simulationResult.g_v_score * 4);

  // ── Handlers ───────────────────────────────────────────────────────────

  function handlePdf() {
    if (!structuredCase || !simulationResult) return;
    generatePdf(structuredCase, simulationResult, rebuttals, messages, analysis);
  }

  async function handleCopy() {
    if (!structuredCase || !simulationResult) return;
    const lines = [
      `Hearing Rehearsal Guide: ${plaintiff} v. ${defendant}`,
      `Jurisdiction: ${structuredCase.jurisdiction}`,
      `Claim Type: ${CLAIM_TYPE_LABELS[structuredCase.claim_type]}`,
      `Grounding Verification: ${Math.round(simulationResult.g_v_score * 100)}%`,
      '',
      'Opposing Arguments and Rebuttals',
      ...simulationResult.arguments.flatMap((arg, i) => [
        '',
        `${i + 1}. ${arg.category.toUpperCase()} — ${arg.confidence} confidence`,
        arg.claim_text,
        `Authorities: ${arg.supporting_authority.map(a => a.citation).join('; ') || 'None cited'}`,
        `Your rebuttal: ${rebuttals[i.toString()] || '[No rebuttal drafted]'}`,
      ]),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <Head>
        <title>Export & Review — {plaintiff} v. {defendant}</title>
        <meta name="description" content="Download your hearing rehearsal guide with arguments and rebuttals." />
      </Head>

      <AppShell
        title="Export & Review"
        description="Hearing Rehearsal Guide"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={handleCopy}>
              {copied ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-signal-success" /> Copied!</>
              ) : (
                <><ClipboardCopy className="h-3.5 w-3.5" /> Copy markdown</>
              )}
            </button>
            <button type="button" className="btn-primary text-sm" onClick={handlePdf}>
              <FileDown className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        }
      >
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Case header */}
          <CaseHeader
            title={`${plaintiff} v. ${defendant}`}
            claimType={CLAIM_TYPE_LABELS[structuredCase.claim_type]}
            jurisdiction={structuredCase.jurisdiction}
            status="complete"
            actions={<GroundingScoreBadge score={simulationResult.g_v_score} />}
          />

          {/* Stats row */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Challenges',   value: String(totalArgs) },
              { label: 'Rebuttals',    value: String(completedRebuttals) },
              { label: 'Grounding',    value: `${Math.round(simulationResult.g_v_score * 100)}%` },
              { label: 'Preparedness', value: `${preparednessScore}/10` },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink-800">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Grounding warning */}
          {simulationResult.insufficient_grounding && (
            <Alert variant="warning">
              The retrieval layer found fewer than the preferred number of strongly matching
              authorities. Treat arguments as practice prompts and verify sources manually.
            </Alert>
          )}

          {/* Arguments + rebuttals */}
          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-800">
              Arguments & Your Rebuttals
            </h2>
            <div className="space-y-4">
              {simulationResult.arguments.map((arg, i) => {
                const rebuttal = rebuttals[i.toString()] || '';
                const hasRebuttal = rebuttal.trim().length > 10;
                return (
                  <Card key={i}>
                    <CardHeader>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {i + 1}. {arg.category} — {arg.confidence} confidence
                        </span>
                        <CardTitle className="mt-1">{arg.claim_text}</CardTitle>
                      </div>
                      <VerificationTag
                        verified={arg.supporting_authority.every(a => !a.unverified) && arg.supporting_authority.length > 0}
                      />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Citations */}
                      {arg.supporting_authority.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {arg.supporting_authority.map((auth, j) => (
                            <CitationBadge
                              key={j}
                              citation={auth.citation}
                              verified={!auth.unverified}
                            />
                          ))}
                        </div>
                      )}

                      {/* Rebuttal */}
                      <div
                        className={[
                          'rounded-md border p-3',
                          hasRebuttal
                            ? 'border-signal-info/25 bg-signal-infoSoft'
                            : 'border-slate-200 bg-slate-50',
                        ].join(' ')}
                      >
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Your rebuttal
                        </p>
                        <p className={['text-sm leading-relaxed', hasRebuttal ? 'text-ink-800' : 'italic text-slate-400'].join(' ')}>
                          {rebuttal || 'No rebuttal drafted.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Weakness analysis */}
          {analysis && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-800">
                Case Weaknesses & Strategy
              </h2>
              <Card>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-warning">
                      Weaknesses
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.weaknesses.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal-warning" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal-success">
                      Improvement tips
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.improvement_tips.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal-success" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Retrieved authorities */}
          {simulationResult.retrieved_authorities.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-800">
                Retrieved Authorities
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {simulationResult.retrieved_authorities.slice(0, 6).map((auth, i) => (
                  <Card key={`${auth.citation}-${i}`}>
                    <CardContent className="py-3">
                      <p className="font-medium text-sm text-ink-800">{auth.case_name}</p>
                      <p className="mt-1 font-mono text-xs text-brass-600">{auth.citation}</p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        {auth.court} · {auth.decision_date} · score {auth.similarity_score.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Hearing prep reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brass-500" aria-hidden="true" />
                Hearing Prep Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  'Practice reading each rebuttal aloud.',
                  'Bring printed evidence and organise it by argument.',
                  'Verify citations before relying on them in a real hearing.',
                  'Consult legal aid or a qualified attorney where possible.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brass-500" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <button type="button" className="btn-secondary" onClick={() => router.push('/intake')}>
              Edit this case
            </button>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => router.push('/simulation')}>
                Continue drafting
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => { clearSession(); router.push('/'); }}
              >
                Start a new case
              </button>
            </div>
          </div>

          <p className="text-center text-xs leading-5 text-slate-400">
            This tool provides educational practice only and is not a substitute for
            qualified attorney representation.
          </p>
        </motion.div>
      </AppShell>
    </>
  );
}
