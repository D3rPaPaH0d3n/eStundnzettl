/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- Das ist der entscheidende Schalter!
  theme: {
    extend: {},
  },
  plugins: [],
}