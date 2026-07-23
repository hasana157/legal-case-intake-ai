// =============================================================================
// components/ui/tabs.tsx
// Accessible, keyboard-navigable tab primitive.
// Used in: Legal Authority panel (statutes / case law / procedural rules)
//          Evidence library (by type), Export screen sections.
// Follows ARIA Tabs pattern: role="tablist", arrow key navigation,
// controlled via value/onValueChange (Radix-UI-compatible API surface).
// =============================================================================

import React, { createContext, useContext, useId, useCallback } from 'react';

// ── Context ──────────────────────────────────────────────────────────────────

interface TabsCtx {
  value: string;
  onValueChange: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsCtx | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('<TabsTrigger> / <TabsContent> must be inside <Tabs>');
  return ctx;
}

// ── Root ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ── TabsList ─────────────────────────────────────────────────────────────────

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}

export function TabsList({ className = '', children, 'aria-label': ariaLabel }: TabsListProps) {
  // Arrow key navigation across triggers
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = e.currentTarget;
    const triggers = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const idx = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      triggers[(idx + 1) % triggers.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      triggers[(idx - 1 + triggers.length) % triggers.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      triggers[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      triggers[triggers.length - 1]?.focus();
    }
  }, []);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={[
        'flex items-center gap-0.5 rounded-md bg-slate-100 p-1',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

// ── TabsTrigger ───────────────────────────────────────────────────────────────

interface TabsTriggerProps {
  value: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function TabsTrigger({ value, className = '', disabled, children }: TabsTriggerProps) {
  const { value: activeValue, onValueChange, baseId } = useTabsContext();
  const isActive = value === activeValue;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={[
        'relative rounded px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:shadow-focus',
        isActive
          ? 'bg-white text-ink-800 shadow-card'
          : 'text-ink-500 hover:text-ink-700',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

// ── TabsContent ───────────────────────────────────────────────────────────────

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsContent({ value, className = '', children }: TabsContentProps) {
  const { value: activeValue, baseId } = useTabsContext();
  if (value !== activeValue) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={['animate-fade-up focus-visible:outline-none', className].join(' ')}
    >
      {children}
    </div>
  );
}
