import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '@/context/SessionContext';
import { DISCLAIMER_COMPACT } from '@/constants/legalNotices';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const NAV_LINKS = [
  { href: '/',           label: 'Home'       },
  { href: '/intake',     label: 'Case Intake' },
  { href: '/simulation', label: 'Simulation'  },
];

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const { clearSession, hasAcceptedDisclaimer, setHasAcceptedDisclaimer } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-navy-100">

      {/* ── Persistent Disclaimer Banner (non-dismissible) ─────────────────── */}
      <div
        role="alert"
        aria-live="polite"
        className="bg-amber-600/20 border-b border-amber-500/40 text-amber-300 text-xs text-center py-2 px-4 font-medium"
      >
        <span className="mr-1">⚖️</span>
        {DISCLAIMER_COMPACT}
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-navy-800 bg-navy-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="Opposing Argument Simulator — Home"
          >
            <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-navy-950 font-black text-sm group-hover:bg-gold-400 transition-colors">
              ⚖
            </div>
            <div>
              <span className="font-bold text-white text-sm leading-none block">
                Opposing Simulator
              </span>
              <span className="text-navy-400 text-xs leading-none">
                Milestone 5 — Rebuttal & Export
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = router.pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive
                          ? 'bg-navy-800 text-white'
                          : 'text-navy-300 hover:text-white hover:bg-navy-800/60'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
              {hasAcceptedDisclaimer && (
                <li className="ml-2 pl-2 border-l border-navy-700">
                  <button
                    onClick={() => {
                      clearSession();
                      router.push('/');
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-150"
                  >
                    Clear Session
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      {/* ── Page title bar ─────────────────────────────────────────────────── */}
      {title && (
        <div className="border-b border-navy-800 bg-navy-900/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-navy-800 bg-navy-900/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-navy-400 text-xs text-center sm:text-left">
              © 2026 Opposing-Argument Simulator · Milestone 2
              <br className="sm:hidden" />
              {' '}· Built by Hasana Zahid · COMSATS University Islamabad
            </p>
            <p className="text-amber-600/70 text-xs font-medium text-center">
              ⚖️ Educational simulation only — not legal advice
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
