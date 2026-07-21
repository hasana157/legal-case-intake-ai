// =============================================================================
// components/ui/Button.tsx
// Replaces the old Button.tsx + Button.module.css pairing. Same component
// name/casing as your existing file so this is a direct drop-in — copy this
// content into frontend/src/components/ui/Button.tsx (overwrite).
//
// Variants:
//   primary     — brass fill, for the single primary action per screen
//                 (Submit, Next, Run Simulation)
//   secondary   — ink outline, for Back / Cancel / secondary actions
//   ghost       — no border, for low-emphasis inline actions (Export PDF
//                 in a toolbar, "Get hints")
//   destructive — muted danger red, for Clear Session / Delete
// Sizes: sm / md / lg. Kept to 3 — a 4th size is almost always a symptom of
// not having a scale.
// =============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brass-500 text-white hover:bg-brass-600 active:bg-brass-700 ' +
    'disabled:bg-slate-200 disabled:text-slate-400',
  secondary:
    'bg-white text-ink-700 border border-slate-300 hover:border-ink-400 hover:bg-slate-50 ' +
    'active:bg-slate-100 disabled:text-slate-300 disabled:border-slate-200',
  ghost:
    'bg-transparent text-ink-600 hover:bg-slate-100 active:bg-slate-200 ' +
    'disabled:text-slate-300',
  destructive:
    'bg-white text-signal-danger border border-signal-danger/30 hover:bg-signal-dangerSoft ' +
    'active:bg-signal-dangerSoft disabled:text-slate-300 disabled:border-slate-200',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9.5 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center rounded-md font-medium font-body',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:shadow-focus',
          'disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
