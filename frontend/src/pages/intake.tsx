// =============================================================================
// frontend/src/pages/intake.tsx
// Milestone 2 — Intake page with multi-step wizard and V2 result display.
//
// Changes from Milestone 1:
// - Uses RawIntake (V2) instead of CaseInput (V1)
// - Success panel shows: extraction method badge, structured case JSON
//   (collapsible), missing-context warning block, and gated "Continue to
//   Simulation" button.
// - Error panel renders 422 messages with actionable instructions.
// =============================================================================

import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import CaseIntakeForm from '@/components/CaseIntakeForm';
import DisclaimerOverlay from '@/components/DisclaimerOverlay';
import { submitCaseIntakeV2 } from '@/services/api';
import { useSession } from '@/context/SessionContext';
import type { RawIntake, IntakeResponseV2 } from '@/types/intake_v2';
import { isCriticalWarning } from '@/types/intake_v2';

type PageState = 'form' | 'success' | 'error';

export default function IntakePage() {
  const [pageState, setPageState] = useState<PageState>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse]   = useState<IntakeResponseV2 | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string>('');
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const { hasAcceptedDisclaimer, setHasAcceptedDisclaimer, setStructuredCase } = useSession();

  async function handleSubmit(data: RawIntake) {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await submitCaseIntakeV2(data);
      setResponse(result);
      setPageState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setPageState('error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setPageState('form');
    setResponse(null);
    setErrorMsg('');
    setJsonExpanded(false);
  }

  // Determine if "Continue to Simulation" should be disabled
  const hasCriticalWarnings = response?.missing_context?.some(isCriticalWarning) ?? false;

  return (
    <Layout title="Case Intake">
      <Head>
        <title>Case Intake — Opposing-Argument Simulator</title>
        <meta
          name="description"
          content="Submit your case facts through a guided wizard to receive AI-structured case analysis for opposing argument simulation."
        />
      </Head>

      {!hasAcceptedDisclaimer && (
        <DisclaimerOverlay onAccept={() => setHasAcceptedDisclaimer(true)} />
      )}

      {/* ── Form state ──────────────────────────────────────────────────── */}
      {pageState === 'form' && (
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live">🟢 Live Pipeline</span>
              <span className="badge-milestone">Milestone 2</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Submit Your Case</h2>
            <p className="text-navy-300">
              Walk through the guided intake wizard below. Your narrative will be
              structured using AI extraction to prepare for opposing-argument simulation.
            </p>
          </div>

          <CaseIntakeForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      )}

      {/* ── Success state ───────────────────────────────────────────────── */}
      {pageState === 'success' && response && (
        <div className="max-w-3xl mx-auto animate-fade-in">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-xl" aria-hidden="true">✓</span>
                <h2 className="text-xl font-bold text-white">Case Structured</h2>
              </div>
              <p className="text-navy-400 text-sm">
                Case ID: <code className="text-gold-400">{response.case_id}</code>
                &nbsp;·&nbsp;
                {/* Extraction method badge */}
                {response.extraction_method === 'groq_llm' ? (
                  <span className="badge-live">🟢 Groq LLM</span>
                ) : (
                  <span className="badge-warning">⚠ Regex Fallback — reduced accuracy</span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                id="intake-reset"
                onClick={handleReset}
                className="btn-secondary text-sm"
              >
                ← Submit Another
              </button>
              <Link
                href="/simulation-v2"
                id="go-to-simulation"
                onClick={() => {
                  if (response && response.structured_case) {
                    setStructuredCase(response.structured_case);
                  }
                }}
                className={`btn-primary text-sm ${hasCriticalWarnings ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                aria-disabled={hasCriticalWarnings}
                tabIndex={hasCriticalWarnings ? -1 : 0}
              >
                Continue to Simulation →
              </Link>
            </div>
          </div>

          {/* Success message */}
          <div className="card mb-6 border-green-500/20 bg-green-500/5">
            <p className="text-green-300 text-sm">{response.message}</p>
          </div>

          {/* ── Missing-context warnings ─────────────────────────────────── */}
          {response.missing_context.length > 0 && (
            <div className="missing-context-block mb-6" role="alert">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-amber-400 text-lg mt-0.5" aria-hidden="true">⚠️</span>
                <div>
                  <h3 className="text-amber-300 font-semibold text-sm">
                    {response.missing_context.length} Warning{response.missing_context.length > 1 ? 's' : ''} — Action May Be Required
                  </h3>
                  <p className="text-amber-300/70 text-xs mt-1">
                    These issues may reduce the accuracy of the downstream simulation.
                    {hasCriticalWarnings && (
                      <strong className="text-amber-200 block mt-1">
                        ⛔ Critical warnings detected — &quot;Continue to Simulation&quot; is disabled
                        until jurisdiction and claim type are resolved.
                      </strong>
                    )}
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-8">
                {response.missing_context.map((warning, i) => (
                  <li
                    key={i}
                    className={`text-sm p-2 rounded-lg flex items-start gap-2 ${
                      isCriticalWarning(warning)
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                        : 'bg-amber-500/5 border border-amber-500/20 text-amber-300'
                    }`}
                  >
                    <span aria-hidden="true" className="mt-0.5">
                      {isCriticalWarning(warning) ? '🚫' : '⚠'}
                    </span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Extraction summary cards ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-navy-400 text-xs mb-1">Disputed Facts</p>
              <p className="text-2xl font-bold text-white">
                {response.structured_case.disputed_facts.length}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-navy-400 text-xs mb-1">Key Dates</p>
              <p className="text-2xl font-bold text-white">
                {response.structured_case.key_dates.length}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-navy-400 text-xs mb-1">Confidence</p>
              <p className={`text-2xl font-bold ${
                response.structured_case.extraction_confidence >= 0.7
                  ? 'text-green-400'
                  : response.structured_case.extraction_confidence >= 0.4
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {Math.round(response.structured_case.extraction_confidence * 100)}%
              </p>
            </div>
          </div>

          {/* ── Extracted facts preview ───────────────────────────────────── */}
          {response.structured_case.disputed_facts.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-gold-400" aria-hidden="true">📋</span>
                Extracted Disputed Facts
              </h3>
              <ul className="space-y-2">
                {response.structured_case.disputed_facts.map((fact, i) => (
                  <li
                    key={i}
                    className="text-navy-200 text-sm pl-4 border-l-2 border-gold-500/30 py-1"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Structured JSON (collapsible) ────────────────────────────── */}
          <div className="card">
            <button
              type="button"
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="w-full flex items-center justify-between mb-2 group"
              aria-expanded={jsonExpanded}
              aria-controls="structured-json-preview"
              id="toggle-json-preview"
            >
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <span className="text-gold-400" aria-hidden="true">{ }</span>
                Structured Case JSON
              </h3>
              <span className="text-navy-400 text-sm group-hover:text-navy-300 transition-colors">
                {jsonExpanded ? '▲ Collapse' : '▼ Expand'}
              </span>
            </button>
            <p className="text-navy-400 text-xs mb-3">
              This is the full structured output that downstream simulation modules will consume.
            </p>
            {jsonExpanded && (
              <pre
                id="structured-json-preview"
                className="json-viewer animate-fade-in"
                aria-label="Structured case JSON response"
              >
                {JSON.stringify(response.structured_case, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {pageState === 'error' && (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="card border-red-500/30 bg-red-500/5 mb-6" role="alert">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-xl mt-0.5" aria-hidden="true">✕</span>
              <div>
                <h2 className="text-red-300 font-bold mb-1">Submission Failed</h2>
                <p className="text-red-200/80 text-sm">{errorMsg}</p>
                <p className="text-navy-400 text-xs mt-2">
                  Make sure the FastAPI backend is running on{' '}
                  <code className="text-navy-300">http://localhost:8000</code>
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            id="intake-retry"
            onClick={handleReset}
            className="btn-secondary"
          >
            ← Try Again
          </button>
        </div>
      )}
    </Layout>
  );
}
