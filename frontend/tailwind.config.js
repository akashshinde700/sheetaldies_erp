/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      colors: (() => {
        // ─────────────────────────────────────────────────────────────
        //  SVT ERP palette — 6 roles, wired through CSS variables so the
        //  same class works in light AND dark mode. The `--c-<role>-<n>`
        //  vars live in index.css (:root = light, :root.dark = dark,
        //  scoped @media screen so PRINT is always the light palette).
        //  Legacy hue names (sky/emerald/rose/…) are remapped onto the
        //  roles here, so `text-sky-700` etc. keep working everywhere.
        // ─────────────────────────────────────────────────────────────
        const ramp = (ns) => Object.fromEntries(
          ['50','100','200','300','400','500','600','700','800','900','950']
            .map((k) => [k, `rgb(var(--c-${ns}-${k}) / <alpha-value>)`])
        );
        const primary = ramp('primary');
        const neutral = ramp('neutral');
        const success = ramp('success');
        const warning = ramp('warning');
        const danger  = ramp('danger');
        const accent  = ramp('accent');
        const info    = ramp('info');
        const heat    = ramp('heat');
        return {
          white: 'rgb(var(--c-white) / <alpha-value>)',
          black: 'rgb(var(--c-black) / <alpha-value>)',
          primary, neutral, success, warning, danger, accent, info, heat,

          // legacy hue aliases → roles
          // indigo IS the brand hue now; sky/blue/cyan read as the distinct
          // "info" role (see index.css) since primary moved off blue.
          indigo: primary, brand: primary,
          sky: info, blue: info, cyan: info,
          slate: neutral, gray: neutral, zinc: neutral,
          emerald: success, green: success, teal: success,
          amber: warning, yellow: warning, orange: warning,
          rose: danger, red: danger, pink: danger,
          violet: accent, purple: accent,

          surface: {
            DEFAULT: 'rgb(var(--c-white) / <alpha-value>)',
            muted:   'rgb(var(--c-neutral-50) / <alpha-value>)',
            subtle:  'rgb(var(--c-neutral-100) / <alpha-value>)',
          },
          ink: {
            DEFAULT:   'rgb(var(--c-neutral-900) / <alpha-value>)',
            secondary: 'rgb(var(--c-neutral-600) / <alpha-value>)',
            muted:     'rgb(var(--c-neutral-400) / <alpha-value>)',
          },
          state: {
            success: 'rgb(var(--c-success-600) / <alpha-value>)',
            error:   'rgb(var(--c-danger-600) / <alpha-value>)',
            warning: 'rgb(var(--c-warning-600) / <alpha-value>)',
            info:    'rgb(var(--c-info-600) / <alpha-value>)',
          },
        };
      })(),
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        // App UI face for the modernized screens. Opt-in via `font-app`;
        // `body` stays Inter so not-yet-migrated pages and every print
        // sheet keep their current typography. (Was IBM Plex Sans — folded
        // onto Inter so the app carries only two faces: Jakarta for
        // headings, Inter for everything else, per the Molten Steel system.)
        app: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'app-mono': ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 6px rgb(15 23 42 / 0.04), 0 12px 28px -8px rgb(15 23 42 / 0.1)',
        'nav-active': '0 0 0 1px rgb(37 99 235 / 0.35), 0 4px 14px -4px rgb(29 78 216 / 0.45)',
        header: '0 1px 0 rgb(15 23 42 / 0.06)',
        drawer: '-4px 0 32px -4px rgb(15 23 42 / 0.2)',
        soft: '0 2px 8px -2px rgb(15 23 42 / 0.06), 0 0 0 1px rgb(15 23 42 / 0.04)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'backdrop-in': 'backdropIn 0.25s ease-out both',
        'scale-in': 'scaleIn 0.25s ease-out both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        backdropIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      maxWidth: {
        readable: '72rem',
        /** Widescreen / projector-friendly upper bound (used with CSS in index.css) */
        shell: '90rem',
        'shell-wide': '112rem',
      },
    },
  },
  plugins: [],
};
