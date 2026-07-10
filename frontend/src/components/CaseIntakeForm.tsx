// =============================================================================
// frontend/src/components/CaseIntakeForm.tsx
// Milestone 2 — Thin wrapper around the multi-step WizardShell.
//
// The Milestone 1 single-form implementation has been completely replaced.
// This component now delegates all form state, validation, and UI to the
// wizard step components inside ./wizard/.
// =============================================================================

import React from 'react';
import type { RawIntake } from '@/types/intake_v2';
import WizardShell from './wizard/WizardShell';

interface CaseIntakeFormProps {
  onSubmit:  (data: RawIntake) => Promise<void>;
  isLoading: boolean;
}

export default function CaseIntakeForm({ onSubmit, isLoading }: CaseIntakeFormProps) {
  return (
    <WizardShell
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
}
