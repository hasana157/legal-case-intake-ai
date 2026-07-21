// =============================================================================
// frontend/src/pages/intake.tsx
// Live intake page — calls /api/intake via CaseIntakeForm (WizardShell) and
// automatically routes to /simulation once structured case facts are returned.
// No JSON debug output, no Groq confidence scores, no pillar labels.
// =============================================================================

import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
<<<<<<< HEAD
import CaseIntakeForm from '@/components/CaseIntakeForm';
=======
import WizardShell from '@/components/wizard/WizardShell';
>>>>>>> 9cca5f7 (feat: redesign frontend and add new components)
import { submitCaseIntakeV2 } from '@/services/api';
import { useSession } from '@/context/SessionContext';
import type { RawIntake } from '@/types/intake_v2';

export default function IntakePage() {
  const router = useRouter();
<<<<<<< HEAD
  const { setStructuredCase } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: RawIntake) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitCaseIntakeV2(data);
      // Save structured case to session — this is the only data the sim page needs
      setStructuredCase(result.structured_case);
      // Auto-navigate to simulation without exposing any raw data to the user
      await router.push('/simulation');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      setIsLoading(false);
    }
  }, [router, setStructuredCase]);

  return (
    <>
      <Head>
        <title>Case Intake – Opposing Counsel Simulator</title>
        <meta
          name="description"
          content="Describe your legal situation and let our AI prepare you to face the strongest counterarguments."
        />
      </Head>

      {/* Full-page gradient background */}
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0c14 0%, #0d1226 60%, #0a0c14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              width: '100%',
              maxWidth: 720,
              marginBottom: 20,
              padding: '14px 20px',
              background: 'rgba(239,83,80,0.12)',
              border: '1px solid rgba(239,83,80,0.4)',
              borderRadius: 12,
              color: '#ef9a9a',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#ef9a9a',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,12,20,0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '4px solid rgba(66,165,245,0.2)',
                borderTop: '4px solid #42A5F5',
                animation: 'spin 0.9s linear infinite',
                marginBottom: 20,
              }}
            />
            <p style={{ color: '#90caf9', fontSize: 16, fontWeight: 500 }}>
              Analysing your case…
            </p>
            <p style={{ color: '#546e7a', fontSize: 13, marginTop: 6 }}>
              This takes a few seconds.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        <CaseIntakeForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </>
=======
  const { setStructuredCase, setSimulationResult } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(data: RawIntake) {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await submitCaseIntakeV2(data);
      setStructuredCase(response.structured_case);
      setSimulationResult(null);
      router.push('/simulation');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Intake analysis failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-navy-50">
      <Head>
        <title>Case Intake - Opposing-Argument Simulator</title>
      </Head>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="mt-2 text-3xl font-bold text-white">
            Prepare your case
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-navy-300">
            Add the case details you want to practice with. Once the case is ready,
            you will enter the debate arena automatically.
          </p>
        </header>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {errorMsg}
          </div>
        )}

        <WizardShell onSubmit={handleSubmit} isLoading={isLoading} />
      </main>
    </div>
>>>>>>> 9cca5f7 (feat: redesign frontend and add new components)
  );
}
