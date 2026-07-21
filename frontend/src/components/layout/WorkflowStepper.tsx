// =============================================================================
// components/layout/WorkflowStepper.tsx
// Horizontal progress across the per-case pipeline: Intake -> Facts ->
// Retrieval -> Simulation -> Rebuttal -> Export. Sits at the top of every
// /cases/[id]/* screen inside AppShell. This is a redesign of the step-bubble
// logic already in WizardShell.tsx, generalized to cover the whole case
// lifecycle (not just the 6 intake sub-steps).
// =============================================================================

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export type WorkflowStageId =
  | 'intake'
  | 'facts'
  | 'retrieval'
  | 'simulation'
  | 'rebuttal'
  | 'export';

interface Stage {
  id: WorkflowStageId;
  label: string;
}

const STAGES: Stage[] = [
  { id: 'intake',     label: 'Intake' },
  { id: 'facts',      label: 'Facts' },
  { id: 'retrieval',  label: 'Authorities' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'rebuttal',   label: 'Rebuttal' },
  { id: 'export',     label: 'Export' },
];

interface WorkflowStepperProps {
  caseId: string;
  currentStage: WorkflowStageId;
  /** Stages the user has already completed / unlocked and can jump back to. */
  reachableStages: WorkflowStageId[];
}

function stageHref(caseId: string, stage: WorkflowStageId) {
  if (stage === 'intake') return `/intake?step=1`;
  return `/cases/${caseId}/${stage}`;
}

export function WorkflowStepper({ caseId, currentStage, reachableStages }: WorkflowStepperProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <nav aria-label="Case workflow" className="border-b border-slate-200 bg-white px-6 py-3">
      <ol className="flex items-center">
        {STAGES.map((stage, i) => {
          const isCurrent = stage.id === currentStage;
          const isComplete = i < currentIndex;
          const isReachable = reachableStages.includes(stage.id) || isCurrent;

          return (
            <li key={stage.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                {isReachable ? (
                  <Link
                    href={stageHref(caseId, stage.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className="group flex items-center gap-2"
                  >
                    <StepBubble complete={isComplete} current={isCurrent} index={i + 1} />
                    <span
                      className={[
                        'text-sm font-medium',
                        isCurrent ? 'text-ink-800' : isComplete ? 'text-ink-600' : 'text-slate-400',
                        'group-hover:text-brass-600',
                      ].join(' ')}
                    >
                      {stage.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex cursor-not-allowed items-center gap-2 opacity-50">
                    <StepBubble complete={false} current={false} index={i + 1} />
                    <span className="text-sm font-medium text-slate-400">{stage.label}</span>
                  </div>
                )}
              </div>

              {i < STAGES.length - 1 && (
                <div
                  className={['mx-3 h-px flex-1', isComplete ? 'bg-brass-300' : 'bg-slate-200'].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepBubble({ complete, current, index }: { complete: boolean; current: boolean; index: number }) {
  return (
    <span
      className={[
        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        complete
          ? 'bg-brass-500 text-white'
          : current
          ? 'border-2 border-brass-500 bg-white text-brass-600'
          : 'border border-slate-300 bg-white text-slate-400',
      ].join(' ')}
    >
      {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : index}
    </span>
  );
}
