/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#070F1E',
          800: '#0F1E36',
          700: '#172A46',
          600: '#233F63'
        },
        skyBlue: '#0EA5E9',
        tealAccent: '#14B8A6',
        warmOrange: '#F97316',
        criticalRed: '#EF4444',
        safeGreen: '#10B981'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
}