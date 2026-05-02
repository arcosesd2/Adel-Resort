/** @type {import('tailwindcss').Config} */
module.exports = {
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
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
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
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        float: 'float 3s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 1s infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      backgroundImage: {
        'gradient-ocean': 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
        'gradient-sand': 'linear-gradient(135deg, #6d3c1f 0%, #dc8f2d 50%, #eec683 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow-ocean': '0 0 20px rgba(2, 132, 199, 0.3)',
        'glow-sand': '0 0 20px rgba(220, 143, 45, 0.3)',
      },
    },
  },
  plugins: [],
}
