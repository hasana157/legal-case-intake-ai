// =============================================================================
// frontend/src/components/wizard/WizardShell.tsx
// Milestone 2 — Multi-step wizard shell: manages step state, progress bar,
// navigation, accessibility (aria-current, focus management), and submission.
// =============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { RawIntake } from '@/types/intake_v2';
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
  icon:   string;
}

const STEPS: StepMeta[] = [
  { number: 1, title: 'Parties & Roles',        icon: '👥' },
  { number: 2, title: 'Claim & Jurisdiction',   icon: '⚖️' },
  { number: 3, title: 'Key Dates',              icon: '📅' },
  { number: 4, title: 'Narrative',              icon: '📝' },
  { number: 5, title: 'Evidence',               icon: '📎' },
  { number: 6, title: 'Review & Submit',        icon: '✅' },
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

  // Track which steps have been individually validated (used for step indicator styling)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Focus the heading of the new step on navigation for screen-reader users
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
    // Only allow jumping to completed steps or the next step
    if (n <= currentStep || completedSteps.has(n - 1)) {
      setCurrentStep(n);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Submission ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    await onSubmit(formData);
  }

  // ── Step props ──────────────────────────────────────────────────────────────

  const commonProps = { formData, updateFormData, onNext: goNext, onBack: goBack };

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Progress bar + Step indicators ──────────────────────────────── */}
      <nav aria-label="Intake form steps" className="mb-8">
        {/* Linear progress bar */}
        <div className="h-1 bg-navy-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
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
              <li key={step.number} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${step.number}: ${step.title}${isCompleted ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
                  disabled={!isClickable}
                  onClick={() => jumpToStep(step.number)}
                  className={`
                    wizard-step-indicator
                    ${isActive    ? 'wizard-step-active'    : ''}
                    ${isCompleted ? 'wizard-step-completed' : ''}
                    ${!isActive && !isCompleted ? 'wizard-step-future' : ''}
                    ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {isCompleted ? '✓' : step.number}
                </button>
                <span className={`text-xs font-medium max-w-[80px] text-center leading-tight ${
                  isActive ? 'text-gold-400' : isCompleted ? 'text-green-400' : 'text-navy-400'
                }`}>
                  {step.title}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Mobile: compact step indicator */}
        <div className="sm:hidden flex items-center justify-between">
          <span className="text-navy-400 text-xs">
            Step <strong className="text-white">{currentStep}</strong> of {STEPS.length}
          </span>
          <span className="text-sm font-semibold text-white">
            {STEPS[currentStep - 1].icon} {STEPS[currentStep - 1].title}
          </span>
        </div>
      </nav>

      {/* ── Step heading (visually hidden focus target for a11y) ─────────── */}
      <h2
        ref={stepHeadingRef}
        tabIndex={-1}
        className="text-xl font-bold text-white mb-6 outline-none flex items-center gap-3"
      >
        <span className="text-2xl" aria-hidden="true">{STEPS[currentStep - 1].icon}</span>
        {STEPS[currentStep - 1].title}
        <span className="text-navy-400 text-sm font-normal ml-auto hidden sm:block">
          {currentStep}/{STEPS.length}
        </span>
      </h2>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <div className="animate-slide-in">
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
