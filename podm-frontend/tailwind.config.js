/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This line is the most important part
  ],
  theme: {
    extend: {
      fontFamily: {
        // This aligns with your globals.css and PoDM planning doc
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Add your brand colors from the planning doc for easy reference
        primary: {
          DEFAULT: '#6B46C1', // Deep Purple
          dark: '#553C9A',
        },
        secondary: {
          DEFAULT: '#EC4899', // Pink
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // A useful plugin for styling form elements
  ],
}