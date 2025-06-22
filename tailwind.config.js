/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            orange: {
                500: '#F53D2D', // Shopee Orange
                600: '#D93627',
                100: '#FFF0ED',
            }
        }
    },
  },
  plugins: [],
}