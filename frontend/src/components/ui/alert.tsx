// =============================================================================
// components/ui/alert.tsx
// Used for: intake.tsx error banner, insufficient_grounding warnings on the
// authorities screen, Qdrant-downtime notices in simulation, and the
// non-dismissible legal disclaimer (via the `legal` variant). Consolidates
// what used to be ad-hoc inline-styled divs in intake.tsx and simulation.tsx.
// =============================================================================

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, Scale, X, type LucideIcon } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'legal';

const VARIANT_META: Record<
  AlertVariant,
  { icon: LucideIcon; classes: string; iconClasses: string }
> = {
  info: {
    icon: Info,
    classes: 'bg-signal-infoSoft border-signal-info/25 text-ink-800',
    iconClasses: 'text-signal-info',
  },
  success: {
    icon: CheckCircle2,
    classes: 'bg-signal-successSoft border-signal-success/25 text-ink-800',
    iconClasses: 'text-signal-success',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-signal-warningSoft border-signal-warning/25 text-ink-800',
    iconClasses: 'text-signal-warning',
  },
  danger: {
    icon: XCircle,
    classes: 'bg-signal-dangerSoft border-signal-danger/25 text-ink-800',
    iconClasses: 'text-signal-danger',
  },
  legal: {
    icon: Scale,
    classes: 'bg-brass-50 border-brass-300 text-ink-800',
    iconClasses: 'text-brass-600',
  },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
  const { icon: Icon, classes, iconClasses } = VARIANT_META[variant];

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 ${classes} ${className}`}
    >
      <Icon className={`mt-0.5 h-4.5 w-4.5 flex-shrink-0 ${iconClasses}`} aria-hidden="true" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm leading-relaxed text-ink-700">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded p-0.5 text-ink-400 hover:bg-black/5 hover:text-ink-700 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
