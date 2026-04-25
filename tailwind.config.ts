import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b12',
        surface: '#13131f',
        raised: '#1c1c2e',
        primary: '#7c5af6',
        'primary-dim': '#6248d4',
        tap: '#00e676',
        'tap-dim': '#00c853',
        'text-primary': '#f1f5f9',
        'text-secondary': '#8b9eb7',
        'text-muted': '#4a5568',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        breathe: 'breathe 2s ease-in-out infinite',
        'pop-in': 'pop-in 0.2s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        ripple: 'ripple 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
