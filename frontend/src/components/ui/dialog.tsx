// =============================================================================
// components/ui/dialog.tsx
// Accessible modal / dialog primitive.
// Renders into a portal via React 18 createPortal. Manages focus trap,
// Escape key close, and aria-modal. Used by: export format picker,
// weakness analysis modal currently inline in simulation.tsx, and any
// future confirmation dialogs.
// =============================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Descriptive title — shown in the header and used as aria-labelledby */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Max width class. Defaults to max-w-lg */
  maxWidth?: string;
  children: React.ReactNode;
}

// ── Focus trap ────────────────────────────────────────────────────────────────

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ── Component ─────────────────────────────────────────────────────────────────

export function Dialog({ open, onClose, title, description, maxWidth = 'max-w-lg', children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Save focus target, restore on close
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus first focusable element inside the panel
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      });
    } else {
      previousFocus.current?.focus();
    }
  }, [open]);

  // Escape closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'relative w-full rounded-xl border border-slate-200 bg-white shadow-overlay',
          'animate-fade-up',
          maxWidth,
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-md font-semibold text-ink-800">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex-shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-slate-100 hover:text-ink-700 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ── DialogFooter ──────────────────────────────────────────────────────────────
// Convenience wrapper for action buttons at the bottom of a dialog.

export function DialogFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={['flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4', className].join(' ')}>
      {children}
    </div>
  );
}
