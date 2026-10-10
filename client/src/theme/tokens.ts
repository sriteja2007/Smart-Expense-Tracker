export const TOKENS = {
  colors: {
    void: '#07080C',
    surface: {
      default: '#0E1017',
      card: '#131621',
      elevated: '#171A27',
      interactive: '#1F2334',
      glass: 'rgba(14, 16, 23, 0.72)',
    },
    brand: {
      violet: '#8B5CF6',
      indigo: '#6366F1',
      blue: '#3B82F6',
      cyan: '#06B6D4',
      glow: '#A78BFA',
    },
    finance: {
      income: '#10B981',
      expense: '#F43F5E',
      transfer: '#38BDF8',
      warning: '#F59E0B',
      neutral: '#94A3B8',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      accent: '#A78BFA',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      standard: 'rgba(255, 255, 255, 0.08)',
      prominent: 'rgba(255, 255, 255, 0.15)',
      glow: 'rgba(139, 92, 246, 0.35)',
    }
  },
  glass: {
    background: 'rgba(14, 16, 23, 0.65)',
    blur: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px'
  },
  animation: {
    duration: {
      instant: 150,
      fast: 250,
      normal: 350,
      slow: 500
    },
    easing: {
      fintechSmooth: [0.16, 1, 0.3, 1], // snappy yet silky
      anticipate: [0.36, 0, 0.66, -0.56],
      spring: { type: 'spring', damping: 25, stiffness: 200 }
    }
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1280px',
    wide: '1536px'
  }
} as const;

export type ThemeTokens = typeof TOKENS;
