import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-md border bg-white px-3.5 py-2 text-sm font-body text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500/50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 ${
          error ? 'border-signal-danger focus-visible:ring-signal-danger/50' : 'border-slate-300 hover:border-slate-400'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
