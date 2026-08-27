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
        // ─────────────────────────────────────────────────────────────
        //  SVT ERP palette
        //
        //  Chhe roles, aur bas. Pehle 12 rang family bikhri hui thi
        //  (sky/blue/indigo/violet primary jaise, emerald/green/teal
        //  success jaise) — ek hi kaam ke liye kai rang.
        //
        //  Har wo shade jo TEXT ke liye use hota hai, white background par
        //  WCAG AA (4.5:1) paar karta hai. Jaanch: scratchpad/palette.js
        // ─────────────────────────────────────────────────────────────

        // PRIMARY — links, active nav, primary buttons.
        // Purana sky cyan-ish tha aur sky-600 sirf 4.10:1 deta tha (fail).
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },

        // NEUTRAL — text, borders, surfaces.
        // 400 sirf text ke liye istemal hota tha (345 jagah) aur 2.56:1 par
        // padhna mushkil tha; ab 4.62:1 — 500 se halka, par AA pass.
        neutral: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#687689', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },

        // SUCCESS — paid, completed, passed
        success: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#047857', 700: '#046c50',
          800: '#065f46', 900: '#064e3b', 950: '#022c22',
        },

        // WARNING — pending, partial, dhyan dene layak
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#b45309', 700: '#a04606',
          800: '#92400e', 900: '#78350f', 950: '#451a03',
        },

        // DANGER — delete, overdue, fail
        danger: {
          50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
          400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
          800: '#9f1239', 900: '#881337', 950: '#4c0519',
        },

        // ACCENT — un flows ke liye jinhe primary se alag dikhna hai
        // (jaise Tally box), taaki wo primary actions me na ghul jayen.
        accent: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
          800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
        },

        // ─────────────────────────────────────────────────────────────
        //  Purane utility naam upar wale roles par bhej diye gaye hain.
        //  Codebase me 2712 jagah raw rang likhe hain — unhe haath se
        //  badalne ke bajaye yahin remap kar diya, isliye `text-sky-700`
        //  jaisa har purana class waise hi chalta hai, bas ab sahi rang
        //  deta hai. Naya code seedha primary/neutral/... use kare.
        // ─────────────────────────────────────────────────────────────
        sky:     { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
        blue:    { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
        indigo:  { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
        cyan:    { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },

        slate:   { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#687689', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
        gray:    { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#687689', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
        zinc:    { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#687689', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },

        emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#047857', 700: '#046c50', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
        green:   { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#047857', 700: '#046c50', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
        teal:    { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#047857', 700: '#046c50', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },

        amber:   { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#b45309', 700: '#a04606', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
        yellow:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#b45309', 700: '#a04606', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
        orange:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#b45309', 700: '#a04606', 800: '#92400e', 900: '#78350f', 950: '#451a03' },

        rose:    { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
        red:     { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
        pink:    { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },

        violet:  { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
        purple:  { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },

        // Purane naam jo pehle se the — ab palette se juda diye gaye,
        // taaki do alag sach na rahen.
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          subtle: '#f1f5f9',
        },
        ink: {
          DEFAULT: '#0f172a',
          secondary: '#475569',
          muted: '#687689',
        },
        state: {
          success: '#047857',
          error: '#e11d48',
          warning: '#b45309',
          info: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
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
