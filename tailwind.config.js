/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line import/no-anonymous-default-export, import/no-default-export
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  plugins: [],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (surface/primary/secondary/content/border/status/divider)
        //    + typography (Satoshi) now come from kaleido-ui/css via @theme.
        //    See src/styles.css `@import "kaleido-ui/css"`. ──
        // ── Legacy palette (app-specific; migrate to semantic tokens gradually) ──
        // ── LICEX Brand Palette: #CDF7F6, #8FB8DE, #9A94BC, #9B5094, #6A605C ──
        licex: {
          aqua: '#CDF7F6',
          sky: '#8FB8DE',
          lavender: '#9A94BC',
          plum: '#9B5094',
          taupe: '#6A605C',
          dark: '#141219',
          surface: '#1E1B24',
          border: '#3D3647',
        },
        background: '#141219',
        'blue-dark': '#231E2B',
        'blue-darker': '#1A1722',
        'blue-darkest': '#120F17',
        cyan: {
          DEFAULT: '#CDF7F6',
          50: '#F5FEFE',
          100: '#EBFDFC',
          200: '#CDF7F6',
          300: '#B2F0EF',
          400: '#95E7E5',
          500: '#8FB8DE',
          600: '#6FA4D4',
          700: '#528DC4',
          800: '#3D72A6',
          900: '#2A537C',
        },
        green: {
          DEFAULT: '#8FB8DE',
          50: '#F0F7FC',
          100: '#DBEBF7',
          200: '#C2DEF2',
          300: '#A8D0ED',
          400: '#8FB8DE',
          500: '#6FA4D4',
          600: '#528DC4',
          700: '#3D72A6',
          800: '#2C547C',
          900: '#1D3854',
        },
        blue: {
          DEFAULT: '#8FB8DE',
          50: '#F0F7FC',
          100: '#DBEBF7',
          200: '#C2DEF2',
          300: '#A8D0ED',
          400: '#8FB8DE',
          500: '#6FA4D4',
          600: '#528DC4',
          700: '#3D72A6',
          800: '#2C547C',
          900: '#1D3854',
        },
        purple: {
          DEFAULT: '#9B5094',
          50: '#FAF2F9',
          100: '#F3E2F2',
          200: '#E6C4E4',
          300: '#D5A2D2',
          400: '#BA77B6',
          500: '#9B5094',
          600: '#843C7E',
          700: '#6A2B65',
          800: '#511E4D',
          900: '#3A1437',
        },
        violet: {
          DEFAULT: '#9A94BC',
          50: '#F7F6FA',
          100: '#EFEFF5',
          200: '#DDDCEB',
          300: '#C6C4DD',
          400: '#B0ADC9',
          500: '#9A94BC',
          600: '#827BA6',
          700: '#68618E',
          800: '#4F4970',
          900: '#373250',
        },
        red: {
          DEFAULT: '#F58D8A',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#F58D8A',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        rose: {
          DEFAULT: '#F43F5E',
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        slate: {
          DEFAULT: '#64748B',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        grey: {
          light: '#A6A6A6',
          lighter: '#D9D9D9',
        },
        'section-lighter': '#3A3C4A',
      },
      spacing: {
        'screen-90': '90vh',
        'screen-80': '80vh',
        'screen-70': '70vh',
      },
      maxHeight: {
        'screen-90': '90vh',
        'screen-80': '80vh',
        'screen-70': '70vh',
      },
      minHeight: {
        'screen-90': '90vh',
        'screen-80': '80vh',
        'screen-70': '70vh',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-in forwards',
        'fadeInUp': 'fadeInUp 0.5s ease-out forwards',
        'slideInRight': 'slideInRight 0.5s ease-out forwards',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scaleIn': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        scaleIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        spin: {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        pulse: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '.9',
            transform: 'scale(1.05)',
          },
        },
        shutdown: {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        }
      },
    },
  },
}
