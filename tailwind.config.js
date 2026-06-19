/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      animation: {
        'float-up': 'floatUp 1s ease-out forwards',
        'pulse-scale': 'pulseScale 0.15s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-80px)' },
        },
        pulseScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px #f59e0b, 0 0 40px #f59e0b' },
          '100%': { boxShadow: '0 0 40px #f59e0b, 0 0 80px #f59e0b, 0 0 120px #f59e0b' },
        },
      },
    },
  },
  plugins: [],
}
