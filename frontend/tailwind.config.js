/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        scrap: {
          paper: '#3b82f6',
          plastic: '#eab308',
          metal: '#64748b',
          copper: '#ea580c',
          ewaste: '#8b5cf6',
          cardboard: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(0, 0, 0, 0.06), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
        'sheet': '0 -4px 20px -2px rgba(0, 0, 0, 0.1)',
        'float': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'alarm': '0 0 40px rgba(239, 68, 68, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'alarm-flash': 'alarmFlash 1s ease-in-out infinite',
      },
      keyframes: {
        alarmFlash: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.85' },
        }
      }
    },
  },
  plugins: [],
}
