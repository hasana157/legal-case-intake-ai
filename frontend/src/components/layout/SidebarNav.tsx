// =============================================================================
// components/layout/SidebarNav.tsx
// Persistent left rail. Replaces the horizontal NAV_LINKS bar in Layout.tsx.
// A left rail (not a top bar) is the correct pattern here because this is a
// workspace product with many destinations (Dashboard, Saved Cases, Practice
// History, Settings) plus a per-case workflow — that's Notion/Linear IA, not
// marketing-site IA.
// =============================================================================

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutGrid,
  FolderOpen,
  History,
  Settings,
  Scale,
  Plus,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',       icon: LayoutGrid },
  { href: '/saved-cases',  label: 'Saved cases',      icon: FolderOpen },
  { href: '/history',      label: 'Practice history', icon: History },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const router = useRouter();

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <aside
      className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white"
      aria-label="Primary navigation"
    >
      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-800 text-brass-400">
          <Scale className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </div>
        <span className="font-display text-sm font-semibold text-ink-800">
          Opposing Simulator
        </span>
      </div>

      {/* New case CTA */}
      <div className="px-3 pt-4">
        <Link
          href="/intake?step=1"
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brass-500 text-sm font-medium text-white transition-colors hover:bg-brass-600 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New case
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brass-50 text-brass-700'
                      : 'text-ink-600 hover:bg-slate-50 hover:text-ink-800',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Secondary nav */}
      <div className="border-t border-slate-100 px-3 py-3">
        <ul className="space-y-0.5">
          {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-slate-100 text-ink-800' : 'text-ink-500 hover:bg-slate-50 hover:text-ink-800',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
