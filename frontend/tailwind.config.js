/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        sand: {
          50: '#fdf8f0',
          100: '#faefd9',
          200: '#f5ddb3',
          300: '#eec683',
          400: '#e5a74f',
          500: '#dc8f2d',
          600: '#c97523',
          700: '#a75b1f',
          800: '#874921',
          900: '#6d3c1f',
        },
        ivory: {
          50: '#fdfcf8',
          100: '#fbf9f4',
          200: '#f5f1e8',
          300: '#ebe4d2',
          400: '#d9cdb0',
        },
        navy: {
          50: '#f4f6fa',
          100: '#dde3ed',
          200: '#bcc7d8',
          300: '#7a8ba8',
          400: '#3d5378',
          500: '#1e3454',
          600: '#172a47',
          700: '#0f1f3a',
          800: '#0a1830',
          900: '#0a1628',
          950: '#060e1c',
        },
        brass: {
          50: '#faf6ee',
          100: '#f1e6cc',
          200: '#e7d3a3',
          300: '#d4b27a',
          400: '#c29e66',
          500: '#b08d57',
          600: '#9a7642',
          700: '#7a5d33',
          800: '#5a4525',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-soft': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'brass-line': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in-soft': 'fade-in-soft 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
        float: 'float 3s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 1s infinite',
        shimmer: 'shimmer 2s linear infinite',
        'brass-line': 'brass-line 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      },
      backgroundImage: {
        'gradient-ocean': 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
        'gradient-sand': 'linear-gradient(135deg, #6d3c1f 0%, #dc8f2d 50%, #eec683 100%)',
        'gradient-ivory': 'linear-gradient(180deg, #fdfcf8 0%, #fbf9f4 100%)',
        'gradient-navy': 'linear-gradient(135deg, #060e1c 0%, #0a1628 50%, #0f1f3a 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow-ocean': '0 0 20px rgba(2, 132, 199, 0.3)',
        'glow-sand': '0 0 20px rgba(220, 143, 45, 0.3)',
        editorial: '0 1px 2px rgba(10, 22, 40, 0.04), 0 12px 40px -12px rgba(10, 22, 40, 0.12)',
        'editorial-lg': '0 1px 2px rgba(10, 22, 40, 0.05), 0 24px 60px -20px rgba(10, 22, 40, 0.18)',
        'brass-glow': '0 0 0 1px rgba(176, 141, 87, 0.25), 0 8px 24px -8px rgba(176, 141, 87, 0.35)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
          },
        },
      },
    },
  },
  plugins: [],
}
