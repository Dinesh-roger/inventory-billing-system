/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        ink: '#16242a',
        paper: '#f5f6f3',
        brand: { 50: '#ecf7f5', 100: '#cfece7', 600: '#0f766e', 700: '#0b5f59', 800: '#0a4b47' },
      },
    },
  },
  plugins: [],
}
