import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DisclaimerOverlay from '@/components/DisclaimerOverlay';
import StreamingArgumentDisplay from '@/components/StreamingArgumentDisplay';
import RebuttalPanel from '@/components/RebuttalPanel';
import { generateOpposition } from '@/services/api';
import type { OpposingArgumentsResponse, RebuttalEntry } from '@/types';

// ── Sample payload used for the demo button ───────────────────────────────────
const SAMPLE_PAYLOAD = {
  case_id: 'DEMO-001',
  case_input: {
    plaintiff_name:  'Jane Smith',
    defendant_name:  'Acme Corporation',
    claim_type:      'breach_of_contract',
    jurisdiction:    'California',
    filing_date:     '2024-01-15',
    incident_date:   '2023-11-01',
    facts:
      'On October 1 2023, plaintiff and defendant entered a written contract for ' +
      'delivery of 500 units of industrial equipment by November 1 2023. Defendant ' +
      'failed to deliver any goods by the contractual deadline and refused to refund ' +
      'the $50,000 deposit paid in advance. Plaintiff suffered consequential losses ' +
      'of approximately $25,000 in lost business revenue as a direct result.',
    relief_sought: 'Compensatory damages of $75,000 including deposit refund and consequential losses',
  },
};

type PageState = 'disclaimer' | 'idle' | 'loading' | 'success' | 'error';

export default function SimulationPage() {
  const [pageState, setPageState]   = useState<PageState>('disclaimer');
  const [response,  setResponse]    = useState<OpposingArgumentsResponse | null>(null);
  const [errorMsg,  setErrorMsg]    = useState<string>('');
  const [rebuttals, setRebuttals]   = useState<Record<string, RebuttalEntry>>({});

  function handleDisclaimerAccept() {
    setPageState('idle');
  }

  async function handleGenerate() {
    setPageState('loading');
    setErrorMsg('');
    try {
      const result = await generateOpposition(SAMPLE_PAYLOAD);
      setResponse(result);
      setPageState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setPageState('error');
    }
  }

  function handleReset() {
    setPageState('idle');
    setResponse(null);
    setErrorMsg('');
    setRebuttals({});
  }

  function handleSaveRebuttal(entry: RebuttalEntry) {
    setRebuttals(prev => ({ ...prev, [entry.argument_id]: entry }));
  }

  return (
    <>
      <Head>
        <title>Simulation — Opposing-Argument Simulator</title>
        <meta
          name="description"
          content="View simulated opposing arguments and prepare your rebuttals."
        />
      </Head>

      {/* Non-dismissible disclaimer overlay */}
      {pageState === 'disclaimer' && (
        <DisclaimerOverlay onAccept={handleDisclaimerAccept} />
      )}

      <Layout title="Simulation">

        {/* ── Idle state ──────────────────────────────────────────────────── */}
        {pageState === 'idle' && (
          <div className="max-w-3xl mx-auto">
            <div className="card-glass text-center py-12 animate-fade-in">
              <div className="text-5xl mb-4" aria-hidden="true">⚖️</div>
              <h2 className="text-2xl font-bold text-white mb-3">Opposition Simulator</h2>
              <p className="text-navy-300 mb-2 max-w-md mx-auto">
                Click the button below to send the sample case to the backend and receive
                a set of mock opposing arguments.
              </p>
              <p className="text-navy-500 text-xs mb-8">
                (Uses hardcoded demo case: Jane Smith v. Acme Corporation — Breach of Contract)
              </p>

              <div className="bg-navy-800/60 border border-navy-600 rounded-xl p-4 mb-8 text-left">
                <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Sample Case Payload
                </p>
                <pre className="json-viewer text-xs" aria-label="Sample payload">
                  {JSON.stringify(SAMPLE_PAYLOAD, null, 2)}
                </pre>
              </div>

              <button
                type="button"
                id="generate-opposition-btn"
                onClick={handleGenerate}
                className="btn-primary text-base px-10 py-4"
                aria-label="Generate mock opposing arguments"
              >
                Generate Opposing Arguments →
              </button>

              <div className="mt-6">
                <Link href="/intake" className="text-navy-400 hover:text-gold-400 text-sm transition-colors">
                  ← Submit your own case via intake form
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading state ────────────────────────────────────────────────── */}
        {pageState === 'loading' && (
          <div
            className="max-w-3xl mx-auto text-center py-24"
            role="status"
            aria-label="Generating opposing arguments"
          >
            <div className="flex justify-center mb-6">
              <div
                className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin"
                aria-hidden="true"
              />
            </div>
            <p className="text-white font-semibold text-lg mb-2">Generating opposing arguments…</p>
            <p className="text-navy-400 text-sm">
              Calling <code className="text-navy-300">POST /api/generate-opposition</code>
            </p>
          </div>
        )}

        {/* ── Success state ────────────────────────────────────────────────── */}
        {pageState === 'success' && response && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-white font-bold text-lg">Simulation Results</h2>
                <p className="text-navy-400 text-sm">
                  {response.arguments.length} opposing arguments generated
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  id="simulation-reset"
                  onClick={handleReset}
                  className="btn-secondary text-sm"
                >
                  ← New Simulation
                </button>
                <Link href="/intake" id="go-to-intake" className="btn-outline text-sm">
                  Submit Real Case
                </Link>
              </div>
            </div>

            {/* Rebuttal summary if any saved */}
            {Object.keys(rebuttals).length > 0 && (
              <div className="card border-green-500/20 bg-green-500/5 mb-6 animate-fade-in">
                <h3 className="text-green-300 font-semibold text-sm mb-2">
                  ✓ {Object.keys(rebuttals).length} rebuttal(s) saved locally
                </h3>
                <p className="text-green-200/70 text-xs">
                  Session persistence (database) will be added in a future milestone.
                  Your notes exist only in this browser session.
                </p>
              </div>
            )}

            {/* Arguments */}
            <StreamingArgumentDisplay response={response} />

            {/* Rebuttal panels for each argument */}
            <div className="mt-6 space-y-3">
              <h3 className="text-white font-semibold">Prepare Your Rebuttals</h3>
              {response.arguments.map(arg => (
                <div key={arg.id} className="card-glass">
                  <p className="text-navy-300 text-sm font-medium mb-2 truncate"
                     title={arg.heading}
                  >
                    {arg.heading}
                  </p>
                  <RebuttalPanel
                    argumentId={arg.id}
                    argumentHeading={arg.heading}
                    onSave={handleSaveRebuttal}
                  />
                </div>
              ))}
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
                  <h2 className="text-red-300 font-bold mb-1">Generation Failed</h2>
                  <p className="text-red-200/80 text-sm">{errorMsg}</p>
                  <p className="text-navy-400 text-xs mt-2">
                    Make sure the FastAPI backend is running:{' '}
                    <code className="text-navy-300">
                      cd api && uvicorn main:app --reload --port 8000
                    </code>
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              id="simulation-retry"
              onClick={handleReset}
              className="btn-secondary"
            >
              ← Try Again
            </button>
          </div>
        )}
      </Layout>
    </>
  );
}
