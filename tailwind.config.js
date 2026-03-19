/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { 
        sans: ['Nunito', 'Inter', 'system-ui', 'sans-serif'], 
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace'] 
      },
      colors: {
        coffee: '#330000',
        brandGreen: '#00973A',
        brandOrange: '#f5af21',
        background: '#f4f4f4', 
      },
      boxShadow: {
        'cute': '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
        'neumorph': '20px 20px 60px #d1d1d1, -20px -20px 60px #ffffff'
      }
    },
  },
  plugins: [],
}