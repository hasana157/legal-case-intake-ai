/** @type {import('tailwindcss').Config} */
// =============================================================================
// Design system tokens — Opposing-Argument Simulator
// Palette rationale:
//   ink   → primary text / chrome, a desaturated navy (not pure black) that
//           reads as "legal document" rather than "app"
//   brass → the single accent color. Used sparingly for verified/primary
//           actions — evokes a court seal / letterhead foil, not a CTA-yellow
//   slate → neutral scale for surfaces, borders, secondary text
//   signal→ semantic colors kept muted/desaturated so they don't compete
//           with brass as "the" accent
// =============================================================================
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f4f6f8',
          100: '#e4e9ee',
          200: '#c8d2dc',
          300: '#a1b0c0',
          400: '#748498',
          500: '#57667a',
          600: '#445264',
          700: '#374252',
          800: '#232c38',   // primary chrome / headers
          900: '#141a22',   // deepest ink, page bg in dark mode
          950: '#0b0e13',
        },
        brass: {
          50:  '#faf6ea',
          100: '#f2e8c8',
          200: '#e4cd8d',
          300: '#d4b15c',
          400: '#c49a3d',
          500: '#a67e2c',   // primary accent — buttons, active states, seals
          600: '#8a6624',
          700: '#6d501f',
          800: '#523c19',
          900: '#3a2b13',
        },
        slate: {
          25:  '#fbfcfd',
          50:  '#f6f8fa',
          100: '#eef1f5',
          200: '#dfe4ea',
          300: '#c6cdd6',
          400: '#9aa5b1',
          500: '#707c8a',
          600: '#54606d',
          700: '#3f4954',
          800: '#2a323b',
          900: '#1b2128',
        },
        signal: {
          success:      '#2f7a4d',
          successSoft:  '#e6f2eb',
          danger:       '#b3261e',
          dangerSoft:   '#fbeae9',
          warning:      '#a5680f',
          warningSoft:  '#faf1e0',
          info:         '#2b5c8a',
          infoSoft:     '#e9f1f8',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // type scale — deliberately restrained, 8 steps
        'micro':  ['0.6875rem', { lineHeight: '1rem',    letterSpacing: '0.02em' }],
        'xs':     ['0.75rem',   { lineHeight: '1.1rem',  letterSpacing: '0.01em' }],
        'sm':     ['0.8125rem', { lineHeight: '1.25rem' }],
        'base':   ['0.9375rem',{ lineHeight: '1.5rem' }],
        'md':     ['1.0625rem',{ lineHeight: '1.6rem' }],
        'lg':     ['1.25rem',  { lineHeight: '1.75rem' }],
        'xl':     ['1.5rem',   { lineHeight: '2rem',    letterSpacing: '-0.01em' }],
        '2xl':    ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em' }],
        '3xl':    ['2.375rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        card:      '0 1px 2px rgba(11,14,19,0.04), 0 1px 1px rgba(11,14,19,0.03)',
        cardHover: '0 4px 14px rgba(11,14,19,0.08), 0 1px 2px rgba(11,14,19,0.04)',
        overlay:   '0 12px 40px rgba(11,14,19,0.18)',
        focus:     '0 0 0 3px rgba(166,126,44,0.35)',
      },
      animation: {
        'fade-up':   'fadeUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'skeleton':  'skeleton 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '0.5' },
          '50%':      { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};