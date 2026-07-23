// =============================================================================
// frontend/src/components/wizard/WizardShell.tsx
// Multi-step wizard shell — manages step state, progress bar, navigation,
// accessibility (aria-current, focus management), and submission.
// Restyled to ink/brass design system (no more navy-*/gold-* classes).
// =============================================================================

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { RawIntake } from '@/types/intake_v2';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Step1Parties from './Step1Parties';
import Step2ClaimJurisdiction from './Step2ClaimJurisdiction';
import Step3KeyDates from './Step3KeyDates';
import Step4Narrative from './Step4Narrative';
import Step5Evidence from './Step5Evidence';
import Step6Review from './Step6Review';

// ── Step definitions ──────────────────────────────────────────────────────────

export interface StepMeta {
  number: number;
  title:  string;
}

const STEPS: StepMeta[] = [
  { number: 1, title: 'Parties & Roles'       },
  { number: 2, title: 'Claim & Jurisdiction'  },
  { number: 3, title: 'Key Dates'             },
  { number: 4, title: 'Narrative'             },
  { number: 5, title: 'Evidence'              },
  { number: 6, title: 'Review & Submit'       },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardShellProps {
  onSubmit:  (data: RawIntake) => Promise<void>;
  isLoading: boolean;
}

// ── Empty form state ──────────────────────────────────────────────────────────

const EMPTY_FORM: RawIntake = {
  parties:      [],
  claim_type:   'contract',
  jurisdiction: '',
  key_dates:    [],
  narrative:    '',
  evidence:     [],
};

// =============================================================================
// WizardShell Component
// =============================================================================

export default function WizardShell({ onSubmit, isLoading }: WizardShellProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData,    setFormData]    = useState<RawIntake>(EMPTY_FORM);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus({ preventScroll: false });
    }
  }, [currentStep]);

  // ── Partial updaters ────────────────────────────────────────────────────────

  const updateFormData = useCallback(<K extends keyof RawIntake>(
    key: K,
    value: RawIntake[K],
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    setCurrentStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setCurrentStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function jumpToStep(n: number) {
    if (n <= currentStep || completedSteps.has(n - 1)) {
      setCurrentStep(n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  const shortcuts = useMemo(() => [
    {
      key: 'n',
      ctrl: true,
      shift: true,
      label: 'Next wizard step',
      handler: () => {
        if (currentStep < STEPS.length) goNext();
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [currentStep]);

  useKeyboardShortcuts(shortcuts);

  // ── Submission ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    await onSubmit(formData);
  }

  // ── Step props ──────────────────────────────────────────────────────────────

  const commonProps = { formData, updateFormData, onNext: goNext, onBack: goBack };
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mx-auto max-w-3xl">

      {/* ── Progress bar + Step indicators ──────────────────────────────── */}
      <nav aria-label="Intake form steps" className="mb-8">
        {/* Linear progress bar */}
        <div className="mb-5 h-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brass-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label={`Step ${currentStep} of ${STEPS.length}`}
          />
        </div>

        {/* Step bubbles — desktop */}
        <ol className="hidden sm:flex items-center justify-between">
          {STEPS.map((step) => {
            const isActive    = step.number === currentStep;
            const isCompleted = completedSteps.has(step.number);
            const isClickable = step.number <= currentStep || completedSteps.has(step.number - 1);

            return (
              <li key={step.number} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${step.number}: ${step.title}${isCompleted ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
                  disabled={!isClickable}
                  onClick={() => jumpToStep(step.number)}
                  className={[
                    'wizard-step-indicator',
                    isActive    ? 'wizard-step-active'    : '',
                    isCompleted ? 'wizard-step-completed' : '',
                    !isActive && !isCompleted ? 'wizard-step-future' : '',
                    !isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  ].filter(Boolean).join(' ')}
                >
                  {isCompleted
                    ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    : step.number}
                </button>
                <span
                  className={[
                    'max-w-[80px] text-center text-xs font-medium leading-tight',
                    isActive ? 'text-brass-600' : isCompleted ? 'text-signal-success' : 'text-slate-400',
                  ].join(' ')}
                >
                  {step.title}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Mobile: compact step indicator */}
        <div className="sm:hidden flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Step <strong className="text-ink-800">{currentStep}</strong> of {STEPS.length}
          </span>
          <span className="text-sm font-semibold text-ink-700">
            {STEPS[currentStep - 1].title}
          </span>
        </div>
      </nav>

      {/* ── Step heading (a11y focus target) ──────────────────────────────── */}
      <h2
        ref={stepHeadingRef}
        tabIndex={-1}
        className="mb-6 flex items-center gap-2 font-display text-xl font-semibold text-ink-800 outline-none"
      >
        {STEPS[currentStep - 1].title}
        <span className="ml-auto hidden text-sm font-normal text-slate-400 sm:block">
          {currentStep}/{STEPS.length}
        </span>
      </h2>

      {/* ── Step content ──────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        {currentStep === 1 && <Step1Parties {...commonProps} />}
        {currentStep === 2 && <Step2ClaimJurisdiction {...commonProps} />}
        {currentStep === 3 && <Step3KeyDates {...commonProps} />}
        {currentStep === 4 && <Step4Narrative {...commonProps} />}
        {currentStep === 5 && <Step5Evidence {...commonProps} />}
        {currentStep === 6 && (
          <Step6Review
            {...commonProps}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
