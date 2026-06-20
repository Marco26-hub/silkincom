import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F2EA',
        'beige-light': '#EDE3D3',
        'beige-medium': '#C9B79C',
        'gold-primary': '#D4AF37',
        'gold-dark': '#B8941C',
        'lake-blue': '#1F3A4A',
        'pearl-grey': '#D8D5CF',
        'soft-grey': '#6F6C65',
        'soft-black': '#171717',
        'warm-white': '#FFFDF8',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        accent: ['var(--font-baskerville)', 'serif'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        'display-lg': ['56px', { lineHeight: '1.15', letterSpacing: '0.02em' }],
        'display-md': ['42px', { lineHeight: '1.2' }],
        'display-sm': ['32px', { lineHeight: '1.25' }],
      },
      spacing: {
        section: '120px',
        'section-mobile': '64px',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        md: '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
