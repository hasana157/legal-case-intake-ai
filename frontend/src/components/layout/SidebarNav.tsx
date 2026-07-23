// =============================================================================
// components/layout/SidebarNav.tsx
// Premium glassmorphic sidebar navigation.
// =============================================================================

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutGrid,
  FolderOpen,
  History,
  Settings,
  Plus,
  Gavel,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',       icon: LayoutGrid },
  { href: '/saved-cases',  label: 'Saved cases',     icon: FolderOpen },
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
      className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col border-r border-white/30 bg-white/60 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.04)]"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/30">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 shadow-md">
          <Gavel className="h-4 w-4 text-amber-400" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          <span className="block font-bold text-sm text-slate-800 leading-tight tracking-tight">
            Opposing Simulator
          </span>
          <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">
            Legal Prep AI
          </span>
        </div>
      </div>

      {/* New case CTA */}
      <div className="px-4 pt-5">
        <Link
          href="/intake?step=1"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(245,158,11,0.4)] transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-[0_4px_18px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Case
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Workspace
        </p>
        <ul className="space-y-1">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm border border-amber-100'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm',
                  ].join(' ')}
                >
                  <Icon
                    className={['h-4 w-4 flex-shrink-0', active ? 'text-amber-600' : 'text-slate-400'].join(' ')}
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Secondary nav */}
      <div className="border-t border-white/30 px-3 py-4">
        <ul className="space-y-1">
          {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-white/80 hover:text-slate-700',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
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
