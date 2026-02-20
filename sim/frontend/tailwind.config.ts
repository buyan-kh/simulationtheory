import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pixel-bg': '#0a0a1a',
        'pixel-panel': '#12122a',
        'pixel-panel-light': '#1a1a3a',
        'pixel-border': '#2a2a5a',
        'pixel-border-light': '#4a4a8a',
        'pixel-border-highlight': '#6a6aaa',
        'pixel-text': '#d0d0e0',
        'pixel-text-dim': '#6a6a8a',
        'neon-cyan': '#00e5ff',
        'neon-magenta': '#ff00aa',
        'neon-green': '#00ff88',
        'neon-gold': '#ffd700',
        'neon-red': '#ff3366',
        'neon-blue': '#4488ff',
        'neon-purple': '#aa44ff',
        'neon-orange': '#ff8844',
        'pixel-grass': '#1a3a1a',
        'pixel-stone': '#2a2a2a',
        'pixel-water': '#0a1a3a',
        'pixel-sand': '#3a3020',
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
