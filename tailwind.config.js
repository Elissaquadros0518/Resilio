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
        skyBlue: '#3F8278',
        tealAccent: '#0F766E',
        warmOrange: '#C2410C',
        criticalRed: '#B91C1C',
        safeGreen: '#047857'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        card: '0 2px 12px -3px rgba(15, 23, 42, 0.08)'
      }
    },
  },
  plugins: [],
}
