/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Deep Charcoal Surface Hierarchy
        void: '#07080C',
        surface: {
          DEFAULT: '#0E1017',
          50: '#1A1D2A',
          100: '#141722',
          200: '#0E1017',
          300: '#0A0B10',
          elevated: '#171A27',
          glass: 'rgba(14, 16, 23, 0.72)',
          highlight: 'rgba(255, 255, 255, 0.04)',
        },
        // Premium Fintech Accents
        brand: {
          violet: '#8B5CF6',
          indigo: '#6366F1',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          glow: '#A78BFA',
        },
        // Financial Semantic Tokens
        finance: {
          income: '#10B981',      // Emerald Green
          expense: '#F43F5E',     // Soft Neon Rose
          transfer: '#38BDF8',    // Sky Blue
          warning: '#F59E0B',     // Amber
          neutral: '#94A3B8',     // Muted Slate
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.04)',
          glow: 'rgba(139, 92, 246, 0.35)',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          accent: '#A78BFA',
        }
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        '2xl': '28px',
        '3xl': '36px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-violet': '0 0 25px -4px rgba(139, 92, 246, 0.35)',
        'glow-blue': '0 0 25px -4px rgba(59, 130, 246, 0.35)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backdropBlur: {
        xs: '4px',
        glass: '16px',
        deep: '24px',
      },
      transitionTimingFunction: {
        'fintech-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
