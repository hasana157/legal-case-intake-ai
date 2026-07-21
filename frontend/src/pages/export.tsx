import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from '@/context/SessionContext';
import generatePdf from '@/services/pdfExport';
import { CLAIM_TYPE_LABELS } from '@/types/intake_v2';

export default function ExportPage() {
  const router = useRouter();
  const { structuredCase, simulationResult, rebuttals, messages, analysis, clearSession } = useSession();

  if (!structuredCase || !simulationResult) {
    return (
      <div className="min-h-screen bg-navy-950 px-4 py-10 text-navy-50">
        <Head>
          <title>Export & Review - Opposing-Argument Simulator</title>
        </Head>
        <main className="mx-auto max-w-2xl card space-y-4">
          <h1 className="text-2xl font-bold text-white">No completed simulation yet</h1>
          <p className="text-sm leading-6 text-navy-300">
            Export becomes available after intake and opposing-argument simulation
            are complete.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => router.push('/intake')}>
              Start intake
            </button>
            {structuredCase && (
              <button type="button" className="btn-secondary" onClick={() => router.push('/simulation')}>
                Continue simulation
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const plaintiff = structuredCase.parties.find(p => p.role === 'plaintiff')?.name || 'Plaintiff';
  const defendant = structuredCase.parties.find(p => p.role === 'defendant')?.name || 'Defendant';
  const totalArgs = simulationResult.arguments.length;
  const completedRebuttals = simulationResult.arguments.filter((_, index) => (
    rebuttals[index.toString()] || ''
  ).trim().length > 10).length;
  const preparednessScore = totalArgs > 0
    ? Math.round((completedRebuttals / totalArgs) * 6 + simulationResult.g_v_score * 4)
    : Math.round(simulationResult.g_v_score * 4);

  function handlePdf() {
    if (!structuredCase || !simulationResult) return;
    generatePdf(structuredCase, simulationResult, rebuttals, messages, analysis);
  }

  async function handleCopy() {
    if (!structuredCase || !simulationResult) return;
    const activeCase = structuredCase;
    const activeResult = simulationResult;
    const lines = [
      `Hearing Rehearsal Guide: ${plaintiff} v. ${defendant}`,
      `Jurisdiction: ${activeCase.jurisdiction}`,
      `Claim Type: ${CLAIM_TYPE_LABELS[activeCase.claim_type]}`,
      `Grounding Verification: ${Math.round(activeResult.g_v_score * 100)}%`,
      '',
      'Opposing Arguments and Rebuttals',
      ...activeResult.arguments.flatMap((arg, index) => [
        '',
        `${index + 1}. ${arg.category.toUpperCase()} - ${arg.confidence} confidence`,
        arg.claim_text,
        `Authorities: ${arg.supporting_authority.map(a => a.citation).join('; ') || 'None cited'}`,
        `Your rebuttal: ${rebuttals[index.toString()] || '[No rebuttal drafted]'}`,
      ]),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50">
      <Head>
        <title>Export & Review - Opposing-Argument Simulator</title>
      </Head>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="card space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-400">
              Practice session ready
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Hearing Rehearsal Guide
            </h1>
            <p className="mt-2 text-sm text-navy-300">
              {plaintiff} v. {defendant} | {structuredCase.jurisdiction}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-navy-400">Challenges</p>
              <p className="mt-2 text-2xl font-bold text-white">{totalArgs}</p>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-navy-400">Rebuttals</p>
              <p className="mt-2 text-2xl font-bold text-white">{completedRebuttals}</p>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-navy-400">Grounding</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {Math.round(simulationResult.g_v_score * 100)}%
              </p>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-navy-400">Preparedness</p>
              <p className="mt-2 text-2xl font-bold text-white">{preparednessScore}/10</p>
            </div>
          </div>

          {simulationResult.insufficient_grounding && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              The retrieval layer found fewer than the preferred number of strongly
              matching authorities. Treat arguments as practice prompts and verify
              sources manually.
            </div>
          )}

          <section>
            {messages.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white">Chat transcript</h2>
                <div className="mt-4 space-y-3">
                  {messages.map((message, index) => (
                    <article
                      key={index}
                      className={`rounded-lg border p-4 ${
                        message.sender === 'opponent'
                          ? 'border-[#EF5350]/40 bg-[#EF5350]/10'
                          : 'border-[#42A5F5]/40 bg-[#42A5F5]/10'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">
                        {message.sender === 'opponent' ? 'Opposing Counsel' : 'Your Rebuttal'}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">{message.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {analysis && (
              <div className="mb-8 rounded-lg border border-gold-400/40 bg-gold-500/10 p-4">
                <h2 className="text-lg font-bold text-white">Case Weaknesses & Strategy to Overcome</h2>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-gold-300">Weaknesses</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-navy-100">
                  {analysis.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-gold-300">Improvement tips</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-navy-100">
                  {analysis.improvement_tips.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}

            <h2 className="text-lg font-bold text-white">Retrieved authorities</h2>
            <div className="mt-4 grid gap-3">
              {simulationResult.retrieved_authorities.slice(0, 6).map((authority, index) => (
                <article key={`${authority.citation}-${index}`} className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
                  <h3 className="text-sm font-semibold text-white">{authority.case_name}</h3>
                  <p className="mt-1 text-xs text-gold-300">{authority.citation}</p>
                  <p className="mt-2 text-xs text-navy-300">
                    {authority.court} | {authority.decision_date} | score {authority.similarity_score.toFixed(2)}
                  </p>
                </article>
              ))}
              {simulationResult.retrieved_authorities.length === 0 && (
                <p className="text-sm text-amber-300">No authorities were retrieved for this session.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Download options</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button type="button" className="btn-primary" onClick={handlePdf}>
                Download PDF
              </button>
              <button type="button" className="btn-secondary" onClick={handleCopy}>
                Copy markdown
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.push('/simulation')}>
                Continue drafting
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-navy-700 bg-navy-900/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-400">
              Hearing prep reminders
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-navy-200">
              <li>Practice reading each rebuttal aloud.</li>
              <li>Bring printed evidence and organize it by argument.</li>
              <li>Verify citations before relying on them in a real hearing.</li>
              <li>Consult legal aid or a qualified attorney where possible.</li>
            </ul>
          </section>

          <div className="flex flex-col gap-3 border-t border-navy-800 pt-6 sm:flex-row sm:justify-between">
            <button type="button" className="btn-secondary" onClick={() => router.push('/intake')}>
              Edit this case
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                clearSession();
                router.push('/');
              }}
            >
              Start a new case
            </button>
          </div>

          <p className="text-center text-xs leading-5 text-navy-400">
            This tool provides educational practice only and is not a substitute for
            qualified attorney representation.
          </p>
        </section>
      </main>
    </div>
  );
}
