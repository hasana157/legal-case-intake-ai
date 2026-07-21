// =============================================================================
// components/layout/AppShell.tsx
// Replaces Layout.tsx. Composes SidebarNav + a slim top bar + an optional
// WorkflowStepper for per-case screens. This is the single wrapper every
// page in pages/ should render inside — Dashboard, Saved Cases, and every
// /cases/[id]/* screen all share this chrome, which is what makes the app
// read as one coherent product rather than six disconnected pages.
// =============================================================================

import React from 'react';
import { WorkflowStepper, type WorkflowStageId } from './WorkflowStepper';
import { SidebarNav } from './SidebarNav';
import { DISCLAIMER_COMPACT } from '@/constants/legalNotices';

interface AppShellProps {
  /** Page title shown in the top bar (e.g. "Dashboard", "Gonzalez v. Sunset PM"). */
  title: string;
  /** Optional short description/subtitle under the title. */
  description?: string;
  /** Optional right-aligned actions rendered in the top bar (buttons, etc). */
  actions?: React.ReactNode;
  /** If present, renders the per-case WorkflowStepper below the top bar. */
  workflow?: {
    caseId: string;
    currentStage: WorkflowStageId;
    reachableStages: WorkflowStageId[];
  };
  children: React.ReactNode;
}

export function AppShell({ title, description, actions, workflow, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact, persistent disclaimer — non-dismissible per SRS FR-4.2 */}
        <div
          role="note"
          className="border-b border-brass-200 bg-brass-50 px-6 py-1.5 text-center text-xs font-medium text-brass-800"
        >
          {DISCLAIMER_COMPACT}
        </div>

        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-ink-800">{title}</h1>
            {description && <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>

        {workflow && (
          <WorkflowStepper
            caseId={workflow.caseId}
            currentStage={workflow.currentStage}
            reachableStages={workflow.reachableStages}
          />
        )}

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
