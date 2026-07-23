import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import WizardShell from '@/components/wizard/WizardShell';
import { Alert } from '@/components/ui/alert';
import { submitCaseIntakeV2 } from '@/services/api';
import { useSession } from '@/context/SessionContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { RawIntake } from '@/types/intake_v2';

export default function IntakePage() {
  const router = useRouter();
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

  // Ctrl+S in this context is a no-op placeholder (form auto-saves to state)
  const shortcuts = useMemo(() => [
    {
      key: 's',
      ctrl: true,
      label: 'Save draft (auto-saved)',
      handler: () => {/* formData is already in WizardShell state */},
    },
  ], []);
  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <Head>
        <title>Case Intake — Opposing-Argument Simulator</title>
        <meta
          name="description"
          content="Enter your case details to prepare for the opposing-argument simulation."
        />
      </Head>

      <AppShell
        title="Prepare your case"
        description="Complete the intake form to begin your practice session."
      >
        {errorMsg && (
          <Alert variant="danger" onDismiss={() => setErrorMsg('')} className="mb-6">
            {errorMsg}
          </Alert>
        )}

        <WizardShell onSubmit={handleSubmit} isLoading={isLoading} />
      </AppShell>
    </>
  );
}
