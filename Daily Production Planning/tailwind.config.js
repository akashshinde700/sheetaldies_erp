export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#fdf2f6',
          100: '#fce7ef',
          200: '#fbcfe0',
          300: '#f7a8c6',
          400: '#f072a3',
          500: '#e14680',
          600: '#c2185b',
          700: '#a3114b',
          800: '#851240',
          900: '#6f1339',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#dcdfe6',
          300: '#b9bfcc',
          400: '#8b93a6',
          500: '#6a7285',
          600: '#525a6b',
          700: '#414856',
          800: '#2c313c',
          900: '#1b1f27',
        },
      },
    },
  },
}
