#!/usr/bin/env node
// =============================================================================
// scaffold_frontend.js
// Windows/PowerShell-friendly version of scaffold_frontend.sh.
// Run from your repo root (same folder that contains "frontend/"):
//
//   node scaffold_frontend.js
//
// Safe to re-run: won't overwrite a file that already has real content
// (only overwrites files whose current content still contains "TODO(phase"),
// unless you pass --force:
//
//   node scaffold_frontend.js --force
// =============================================================================

const fs = require('fs');
const path = require('path');

const FORCE = process.argv.includes('--force');
const ROOT = path.join('frontend', 'src');

function write(relPath, content) {
  const exists = fs.existsSync(relPath);
  if (exists && !FORCE) {
    const current = fs.readFileSync(relPath, 'utf8');
    if (current.trim().length > 0 && !current.includes('TODO(phase')) {
      console.log(`  skip (already has real content): ${relPath}`);
      return;
    }
  }
  fs.mkdirSync(path.dirname(relPath), { recursive: true });
  fs.writeFileSync(relPath, content.trimStart());
  console.log(`  wrote: ${relPath}`);
}

console.log('== Creating directory tree ==');
[
  'components/ui',
  'components/layout',
  'components/simulation',
  'components/dashboard',
  'components/intake',
  'components/evidence',
  'components/authorities',
  'components/rebuttal',
  'components/export',
  'components/history',
  'pages/cases/[id]',
  'styles',
  'hooks',
  'lib',
].forEach((d) => fs.mkdirSync(path.join(ROOT, d), { recursive: true }));

// ── Phase 1: Design tokens & primitives ──────────────────────────────────────
console.log('== Phase 1: tokens & primitives ==');

write(
  path.join('frontend', 'tailwind.config.js'),
  `/** @type {import('tailwindcss').Config} */
// Palette: ink (navy) / brass (accent) / slate (neutral) / signal (muted semantic colors).
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: { 50:'#f4f6f8',100:'#e4e9ee',200:'#c8d2dc',300:'#a1b0c0',400:'#748498',500:'#57667a',600:'#445264',700:'#374252',800:'#232c38',900:'#141a22',950:'#0b0e13' },
        brass:{ 50:'#faf6ea',100:'#f2e8c8',200:'#e4cd8d',300:'#d4b15c',400:'#c49a3d',500:'#a67e2c',600:'#8a6624',700:'#6d501f',800:'#523c19',900:'#3a2b13' },
        slate:{ 25:'#fbfcfd',50:'#f6f8fa',100:'#eef1f5',200:'#dfe4ea',300:'#c6cdd6',400:'#9aa5b1',500:'#707c8a',600:'#54606d',700:'#3f4954',800:'#2a323b',900:'#1b2128' },
        signal:{ success:'#2f7a4d', successSoft:'#e6f2eb', danger:'#b3261e', dangerSoft:'#fbeae9', warning:'#a5680f', warningSoft:'#faf1e0', info:'#2b5c8a', infoSoft:'#e9f1f8' },
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro:['0.6875rem',{lineHeight:'1rem',letterSpacing:'0.02em'}],
        xs:   ['0.75rem',  {lineHeight:'1.1rem',letterSpacing:'0.01em'}],
        sm:   ['0.8125rem',{lineHeight:'1.25rem'}],
        base: ['0.9375rem',{lineHeight:'1.5rem'}],
        md:   ['1.0625rem',{lineHeight:'1.6rem'}],
        lg:   ['1.25rem',  {lineHeight:'1.75rem'}],
        xl:   ['1.5rem',   {lineHeight:'2rem',letterSpacing:'-0.01em'}],
        '2xl':['1.875rem', {lineHeight:'2.25rem',letterSpacing:'-0.015em'}],
        '3xl':['2.375rem', {lineHeight:'2.75rem',letterSpacing:'-0.02em'}],
      },
      spacing: { '4.5':'1.125rem', '13':'3.25rem', '18':'4.5rem' },
      borderRadius: { sm:'4px', DEFAULT:'6px', md:'8px', lg:'10px', xl:'14px' },
      boxShadow: {
        card:'0 1px 2px rgba(11,14,19,0.04), 0 1px 1px rgba(11,14,19,0.03)',
        cardHover:'0 4px 14px rgba(11,14,19,0.08), 0 1px 2px rgba(11,14,19,0.04)',
        overlay:'0 12px 40px rgba(11,14,19,0.18)',
        focus:'0 0 0 3px rgba(166,126,44,0.35)',
      },
      animation: { 'fade-up':'fadeUp 0.28s cubic-bezier(0.16,1,0.3,1)', 'skeleton':'skeleton 1.6s ease-in-out infinite' },
      keyframes: {
        fadeUp: { '0%':{opacity:'0',transform:'translateY(6px)'}, '100%':{opacity:'1',transform:'translateY(0)'} },
        skeleton: { '0%, 100%':{opacity:'0.5'}, '50%':{opacity:'1'} },
      },
    },
  },
  plugins: [],
};
`,
);

write(
  path.join(ROOT, 'styles', 'tokens.css'),
  `/* TODO(phase1): CSS custom-property mirror of tailwind.config.js tokens,
   for use in non-Tailwind contexts (e.g. jsPDF color refs, chart libs). */
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'badges.tsx'),
  `// Paste the full ConfidenceBadge / VerificationTag / CitationBadge /
// StatusChip / GroundingScoreBadge implementation from the chat here.
// TODO(phase1): replace this stub.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'button.tsx'),
  `// TODO(phase1): shadcn-style Button — variants: primary (brass), secondary
// (outline ink), ghost, destructive. Replaces Button.tsx + Button.module.css.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'card.tsx'),
  `// TODO(phase1): Card, CardHeader, CardTitle, CardContent, CardFooter.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'table.tsx'),
  `// TODO(phase1): Table primitives for Practice History / Saved Cases lists.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'alert.tsx'),
  `// TODO(phase1): Alert — info/success/warning/danger, used for error states
// and the disclaimer banner.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'skeleton.tsx'),
  `// TODO(phase1): Skeleton loader — replaces spinner-only loading states in
// intake.tsx and StreamingArgumentDisplay.tsx.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'tabs.tsx'),
  `// TODO(phase1): Tabs — used in Legal Authority panel (statutes / case law /
// procedural rules) and Evidence library (by type).
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'empty-state.tsx'),
  `// TODO(phase1): EmptyState — icon + message + action, used across Evidence,
// Saved Cases, Practice History when a list is empty.
`,
);

// ── Phase 2: Layout shell ────────────────────────────────────────────────────
console.log('== Phase 2: layout shell ==');

write(
  path.join(ROOT, 'components', 'layout', 'AppShell.tsx'),
  `// TODO(phase2): Persistent shell — left rail nav + top bar. Replaces
// Layout.tsx's simple header/footer with a real app chrome.
`,
);

write(
  path.join(ROOT, 'components', 'layout', 'WorkflowStepper.tsx'),
  `// TODO(phase2): Intake -> Facts -> Retrieval -> Simulation -> Rebuttal ->
// Export stepper. Used at the top of every /cases/[id]/* screen.
`,
);

write(
  path.join(ROOT, 'components', 'layout', 'SidebarNav.tsx'),
  `// TODO(phase2): Left rail — Dashboard, Saved Cases, Practice History, Settings.
`,
);

// ── Phase 3: Screens ─────────────────────────────────────────────────────────
console.log('== Phase 3: screens ==');

write(
  path.join(ROOT, 'pages', 'dashboard.tsx'),
  `// TODO(phase3): Dashboard — case list, quick stats, "New Case" CTA.
`,
);

write(
  path.join(ROOT, 'components', 'dashboard', 'CaseSummaryCard.tsx'),
  `// TODO(phase3): Card shown per-case on the Dashboard (uses StatusChip).
`,
);

write(
  path.join(ROOT, 'pages', 'cases', '[id]', 'facts.tsx'),
  `// TODO(phase3): Structured Facts Review — surfaces StructuredCaseV2
// (parties, key_dates, disputed_facts, missing_context) for user confirmation
// before retrieval runs.
`,
);

write(
  path.join(ROOT, 'pages', 'cases', '[id]', 'authorities.tsx'),
  `// TODO(phase3): Legal Authority panel — statutes / case law / procedural
// rules, wired to retrieveAuthorities() in services/api.ts.
`,
);

write(
  path.join(ROOT, 'components', 'authorities', 'AuthorityCard.tsx'),
  `// TODO(phase3): Single retrieved authority — case name, citation, court,
// similarity score, excerpt. Reused in authorities.tsx and inside
// ArgumentCard's "why this argument" expansion.
`,
);

write(
  path.join(ROOT, 'pages', 'cases', '[id]', 'simulation.tsx'),
  `// TODO(phase3): Rebuild of simulation.tsx — split view using ArgumentCard,
// no avatars/speech bubbles. See ArgumentComparisonView.tsx.
`,
);

write(
  path.join(ROOT, 'components', 'simulation', 'ArgumentCard.tsx'),
  `// Paste the full ArgumentCard implementation from the chat here.
// TODO(phase1): replace this stub.
`,
);

write(
  path.join(ROOT, 'components', 'simulation', 'ArgumentComparisonView.tsx'),
  `// TODO(phase3): Two-column layout composing ArgumentCard for "Your Position"
// vs "Likely Opposing Position", replaces the VS-lightning arena layout.
`,
);

write(
  path.join(ROOT, 'components', 'simulation', 'LegalContextPanel.tsx'),
  `// TODO(phase3): Collapsible panel showing retrieved_authorities for the
// current turn — sits below the comparison view.
`,
);

write(
  path.join(ROOT, 'pages', 'cases', '[id]', 'rebuttal.tsx'),
  `// TODO(phase3): Dedicated rebuttal workspace — consolidates RebuttalPanel.tsx
// and RebuttalWorkspace.tsx into one component.
`,
);

write(
  path.join(ROOT, 'components', 'rebuttal', 'RebuttalEditor.tsx'),
  `// TODO(phase3): The consolidated editor (replaces RebuttalPanel +
// RebuttalWorkspace duplication noted in the audit).
`,
);

write(
  path.join(ROOT, 'pages', 'evidence.tsx'),
  `// TODO(phase3): Evidence library with previews — new screen, backed by
// StructuredCaseV2.available_evidence.
`,
);

write(
  path.join(ROOT, 'components', 'evidence', 'EvidenceCard.tsx'),
  `// TODO(phase3): Single evidence item card with type icon + preview.
`,
);

write(
  path.join(ROOT, 'pages', 'history.tsx'),
  `// TODO(phase3): Practice history — past debate sessions, uses Table + StatusChip.
`,
);

write(
  path.join(ROOT, 'pages', 'saved-cases.tsx'),
  `// TODO(phase3): Saved cases list — uses Table + CaseSummaryCard.
`,
);

write(
  path.join(ROOT, 'pages', 'cases', '[id]', 'export.tsx'),
  `// TODO(phase3): Real export screen wired to actual session data (current
// export.tsx is hardcoded mock content — replace entirely).
`,
);

write(
  path.join(ROOT, 'pages', 'settings.tsx'),
  `// TODO(phase3): Settings — theme toggle, disclaimer re-acknowledgement, data
// clearing (maps to SessionContext.clearSession).
`,
);

// ── Phase 4: Interaction polish ──────────────────────────────────────────────
console.log('== Phase 4: interaction ==');

write(
  path.join(ROOT, 'hooks', 'useKeyboardShortcuts.ts'),
  `// TODO(phase4): Ctrl+Enter to send rebuttal, arrow keys / [ ] to move between
// workflow steps.
`,
);

write(
  path.join(ROOT, 'components', 'ui', 'loading-skeletons.tsx'),
  `// TODO(phase4): Named skeleton layouts (ArgumentCardSkeleton, TableSkeleton,
// FactsReviewSkeleton) built on ui/skeleton.tsx.
`,
);

console.log('');
console.log("Done. Search for 'TODO(phase' across the repo to see what's left to fill in.");