// =============================================================================
// components/ui/card.tsx
// Base surface used everywhere: dashboard case tiles, argument cards build on
// top of this, authority cards, evidence cards, settings panels. Keeping one
// Card primitive is what makes 12 different screens feel like one product.
// =============================================================================

import React from 'react';

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-lg border border-slate-200 bg-white shadow-card',
        interactive && 'transition-shadow hover:shadow-cardHover cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cx('font-display text-md font-semibold text-ink-800', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('mt-0.5 text-sm text-slate-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3', className)}
      {...props}
    />
  );
}
