export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0f1720',
          muted: '#5b6672',
          soft: '#8a949e',
        },
        surface: {
          DEFAULT: '#ffffff',
          sunken: '#f3f5f7',
          head: '#eaeef2',
          accent: '#e8f0f7',
        },
        line: {
          DEFAULT: '#dfe4e9',
          strong: '#c1cad3',
        },
        accent: {
          DEFAULT: '#1f4e79',
          hover: '#183d5f',
        },
        ok: '#1b7f4b',
        warn: '#b7791f',
        danger: '#b42318',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sheet: '6px',
      },
    },
  },
  plugins: [],
}
