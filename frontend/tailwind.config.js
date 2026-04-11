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
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f4f6fb',
          subtle: '#e8ecf7',
        },
        ink: {
          DEFAULT: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
        },
        // ✅ NEW: Semantic state colors
        state: {
          success: '#10b981',    // Emerald
          error: '#ef4444',      // Rose
          warning: '#f59e0b',    // Amber
          info: '#0ea5e9',       // Sky
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 6px rgb(15 23 42 / 0.04), 0 12px 28px -8px rgb(15 23 42 / 0.1)',
        'nav-active': '0 0 0 1px rgb(99 102 241 / 0.35), 0 4px 14px -4px rgb(79 70 229 / 0.45)',
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
