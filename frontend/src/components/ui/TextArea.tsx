// =============================================================================
// components/ui/textarea.tsx
// Matches Input styling exactly so form layouts look consistent.
// =============================================================================

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          'w-full rounded-md border bg-white px-3.5 py-2 text-sm text-ink-800',
          'placeholder:text-slate-400 leading-relaxed resize-y',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500/20',
          'hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70',
          'transition',
          error
            ? 'border-signal-danger focus-visible:ring-signal-danger/30'
            : 'border-slate-200 focus-visible:border-brass-400',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
