/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // paleta OneVoice27 (grafika #AllThingsNew): ciemne indygo tla i fiolet akcentu
        brand: { DEFAULT: '#2c2168', light: '#8b6ff5' }
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'serif']
      }
    }
  },
  plugins: []
}
