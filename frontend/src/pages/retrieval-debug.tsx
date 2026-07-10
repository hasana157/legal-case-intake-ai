import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { retrieveAuthorities } from '@/services/api';
import type { RetrievalResponse, RetrievedAuthorityV2 } from '@/services/api';
import type { StructuredCaseV2 } from '@/types/intake_v2';

// A mock case to allow easy testing of the retrieval endpoint.
const MOCK_CASE: StructuredCaseV2 = {
  case_id: 'TEST-1234',
  jurisdiction: 'California',
  claim_type: 'tenancy',
  parties: [
    { name: 'John Tenant', role: 'plaintiff' },
    { name: 'Acme Property Management', role: 'defendant' },
  ],
  key_dates: [{ label: 'Incident date', date: '2024-01-01' }],
  disputed_facts: [
    'The landlord failed to return the security deposit within 21 days.',
    'No itemized list of deductions was provided.',
    'The apartment was left in clean condition with photo evidence.',
  ],
  available_evidence: [],
  raw_narrative: 'I moved out and the landlord kept my deposit.',
  jurisdiction_validated: true,
  missing_context: [],
  extraction_confidence: 0.95,
  processed_at: new Date().toISOString(),
};

export default function RetrievalDebugPage() {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(MOCK_CASE, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<RetrievalResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleRetrieve() {
    setIsLoading(true);
    setErrorMsg('');
    setResponse(null);
    try {
      const parsedCase = JSON.parse(jsonInput) as StructuredCaseV2;
      const result = await retrieveAuthorities(parsedCase, 5);
      setResponse(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid JSON or server error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Layout title="Retrieval Debug">
      <Head>
        <title>Retrieval Debug — Opposing-Argument Simulator</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live">🟢 Live Pipeline</span>
            <span className="badge-milestone">Milestone 3</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">RAG Retrieval Debugger</h2>
          <p className="text-navy-300">
            Paste a <code className="text-gold-400">StructuredCaseV2</code> JSON payload below to query the Qdrant vector database directly.
            This bypasses the intake flow and LLM generation so you can test search quality and jurisdiction filtering in isolation.
          </p>
        </div>

        <div className="card space-y-4">
          <h3 className="text-white font-semibold">Input (StructuredCase JSON)</h3>
          <textarea
            className="form-textarea font-mono text-xs h-64"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button
            onClick={handleRetrieve}
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Querying Qdrant...' : 'Run Retrieval'}
          </button>
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              ⚠ {errorMsg}
            </div>
          )}
        </div>

        {response && (
          <div className="card space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Retrieval Results</h3>
              <div className="text-sm">
                Found <strong className="text-gold-400">{response.authorities.length}</strong> authorities
              </div>
            </div>

            {response.insufficient_grounding && (
              <div className="missing-context-block">
                <p className="text-amber-300 text-sm">
                  <strong className="text-lg">⚠️ Insufficient Grounding</strong><br />
                  Fewer than 3 results met the required relevance threshold. Argument generation may be weak or hallucinatory.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {response.authorities.length === 0 ? (
                <p className="text-navy-400 italic">No authorities found. Try tweaking the facts or lowering the threshold.</p>
              ) : (
                response.authorities.map((auth, idx) => (
                  <div key={idx} className="p-4 bg-navy-800/50 rounded-lg border border-navy-700/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-gold-400 font-bold">{auth.case_name}</h4>
                        <p className="text-navy-300 text-sm">{auth.citation} · {auth.court} ({auth.decision_date})</p>
                      </div>
                      <div className="text-right">
                        <span className="badge-live text-[10px]">{auth.jurisdiction}</span>
                        <div className="text-xs text-navy-400 mt-1">Score: {(auth.similarity_score * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-3 text-navy-200 text-sm bg-navy-900 p-3 rounded border border-navy-700/50 max-h-40 overflow-y-auto">
                      {auth.matched_chunk_text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
