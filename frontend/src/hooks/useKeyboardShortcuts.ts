// =============================================================================
// hooks/useKeyboardShortcuts.ts
// Global keyboard shortcut registry.
// Usage: call once in a top-level component (e.g. AppShell or _app.tsx).
// Each shortcut is a descriptor object; the hook registers/unregisters a
// single keydown listener and dispatches to the correct handler.
//
// Built-in shortcuts (can be overridden by callers):
//   Ctrl+Enter  → submit / primary action
//   Ctrl+S      → save draft
//   Ctrl+Shift+N → next wizard step
// =============================================================================

import { useEffect, useCallback } from 'react';

export interface Shortcut {
  /** Key value as reported by KeyboardEvent.key, e.g. 'Enter', 's', 'n' */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Human-readable label for documentation / tooltips */
  label?: string;
  handler: (event: KeyboardEvent) => void;
}

/**
 * Registers a set of keyboard shortcuts for the lifetime of the component.
 * Pass a stable array (useMemo) to avoid re-registering on every render.
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'Enter', ctrl: true, label: 'Submit rebuttal', handler: handleSubmit },
 *   { key: 's', ctrl: true, label: 'Save draft', handler: handleSave },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if focus is inside an editable element that uses Ctrl shortcuts natively
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        // Allow Ctrl+Enter on textareas (intentional submit shortcut)
        (target.tagName === 'TEXTAREA' &&
          !(e.ctrlKey && e.key === 'Enter'));

      if (isEditable && !(e.ctrlKey && e.key === 'Enter')) return;

      for (const shortcut of shortcuts) {
        const ctrlMatch  = !!shortcut.ctrl  === e.ctrlKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch   = !!shortcut.alt   === e.altKey;
        const keyMatch   = shortcut.key.toLowerCase() === e.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
