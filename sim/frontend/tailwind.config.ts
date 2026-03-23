import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pixel-bg': '#e8dfd2',
        'pixel-panel': '#f5f0e6',
        'pixel-panel-light': '#ece5d8',
        'pixel-border': '#c4b6a2',
        'pixel-border-light': '#a89880',
        'pixel-border-highlight': '#8a7a64',
        'pixel-text': '#2a2a3a',
        'pixel-text-dim': '#8a7e72',
        'neon-cyan': '#4a9aaa',
        'neon-magenta': '#c45a7a',
        'neon-green': '#5a9a5a',
        'neon-gold': '#c49a35',
        'neon-red': '#c4555a',
        'neon-blue': '#6a88b5',
        'neon-purple': '#8a6aaa',
        'neon-orange': '#cc7744',
        'pixel-grass': '#7ab868',
        'pixel-stone': '#b0a898',
        'pixel-water': '#7ab4c8',
        'pixel-sand': '#d4c4a0',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      fontSize: {
        'pixel-xs': ['8px', { lineHeight: '12px' }],
        'pixel-sm': ['10px', { lineHeight: '16px' }],
        'pixel-base': ['12px', { lineHeight: '20px' }],
        'pixel-lg': ['16px', { lineHeight: '24px' }],
        'pixel-xl': ['20px', { lineHeight: '28px' }],
        'pixel-2xl': ['28px', { lineHeight: '36px' }],
      },
      animation: {
        'pixel-blink': 'pixel-blink 1s steps(2) infinite',
        'pixel-bounce': 'pixel-bounce 0.6s steps(3) infinite',
        'pixel-float': 'pixel-float 2s steps(4) infinite',
        'pixel-pulse': 'pixel-pulse 1.5s steps(3) infinite',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
        'fade-up': 'fade-up 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.2s ease-out forwards',
        'shake': 'shake 0.3s steps(4)',
      },
      keyframes: {
        'pixel-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pixel-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-2px)' },
          '75%': { transform: 'translateY(2px)' },
        },
        'pixel-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 currentColor' },
          '50%': { boxShadow: '0 0 0 4px transparent' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
