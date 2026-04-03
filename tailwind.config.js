/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- This is required for the dark theme to work!
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}