/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1115',
        'dark-card': '#1a1d24',
        'dark-sidebar': '#1a1d24',
        'green-accent': '#10b981',
        'blue-accent': '#3b82f6',
      }
    },
  },
  plugins: [],
}
