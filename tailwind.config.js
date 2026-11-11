/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-50-rgb, 255 247 237) / <alpha-value>)',
          100: 'rgb(var(--brand-100-rgb, 255 237 213) / <alpha-value>)',
          200: 'rgb(var(--brand-200-rgb, 254 215 170) / <alpha-value>)',
          300: 'rgb(var(--brand-300-rgb, 253 186 116) / <alpha-value>)',
          400: 'rgb(var(--brand-400-rgb, 251 146 60) / <alpha-value>)',
          500: 'rgb(var(--brand-500-rgb, 249 115 22) / <alpha-value>)',
          600: 'rgb(var(--brand-600-rgb, 234 88 12) / <alpha-value>)',
          700: 'rgb(var(--brand-700-rgb, 194 65 12) / <alpha-value>)',
          800: 'rgb(var(--brand-800-rgb, 154 52 18) / <alpha-value>)',
          900: 'rgb(var(--brand-900-rgb, 124 45 18) / <alpha-value>)',
          950: 'rgb(var(--brand-950-rgb, 67 20 7) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
