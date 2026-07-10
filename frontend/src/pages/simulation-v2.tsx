import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import StreamingArgumentDisplay from '@/components/simulation/StreamingArgumentDisplay';
import type { StructuredCaseV2 } from '@/types/intake_v2';
import { useSession } from '@/context/SessionContext';
import DisclaimerOverlay from '@/components/DisclaimerOverlay';

// A mock V2 case for testing the simulation engine
const MOCK_CASE_V2: StructuredCaseV2 = {
  case_id: 'V2-DEMO-001',
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

export default function SimulationV2Page() {
  const [isStarted, setIsStarted] = useState(false);
  const { structuredCase, hasAcceptedDisclaimer, setHasAcceptedDisclaimer } = useSession();
  
  const activeCase = structuredCase || MOCK_CASE_V2;

  return (
    <>
      <Head>
        <title>Simulation V2 — Opposing-Argument Simulator</title>
      </Head>
      
      {!hasAcceptedDisclaimer && (
        <DisclaimerOverlay onAccept={() => setHasAcceptedDisclaimer(true)} />
      )}
      
      <Layout title="Simulation Workspace">
        {!isStarted ? (
          <div className="max-w-3xl mx-auto">
            <div className="card-glass text-center py-12 animate-fade-in">
              <div className="text-5xl mb-4" aria-hidden="true">⚖️</div>
              <h2 className="text-2xl font-bold text-white mb-3">Opposition Simulator (V2)</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="badge-live">Live LLM Generation</span>
                <span className="badge-milestone">Milestone 5</span>
              </div>
              <p className="text-navy-300 mb-8 max-w-md mx-auto">
                This triggers the full engine: Qdrant retrieval, Groq streaming generation, citation verification, and the Rebuttal Workspace.
              </p>
              
              <button
                onClick={() => setIsStarted(true)}
                className="btn-primary text-base px-10 py-4"
              >
                Start Simulation Stream →
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-white">Live Simulation</h1>
                <p className="text-navy-400 text-sm">Streaming from Groq (Llama-3.3-70b-versatile)</p>
              </div>
              <button 
                onClick={() => setIsStarted(false)} 
                className="btn-secondary text-xs"
              >
                ← Restart
              </button>
            </div>
            
            <StreamingArgumentDisplay structuredCase={activeCase} />
          </div>
        )}
      </Layout>
    </>
  );
}
