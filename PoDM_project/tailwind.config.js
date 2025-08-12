/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark mode to be toggled via a class on the HTML element
  darkMode: 'class',

  // Configure files to scan for Tailwind classes
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all relevant files in the src directory
  ],

  theme: {
    extend: {
      // --- COLOR PALETTE ---
      // As defined in section 8.1 of your planning document
      colors: {
        primary: {
          DEFAULT: '#6B46C1', // Deep Purple
          hover: '#553C9A',   // A slightly darker shade for hover states
        },
        secondary: {
          DEFAULT: '#EC4899', // Pink
        },
        // Neutral colors for backgrounds, text, and borders
        neutral: {
          'bg-light': '#F3F4F6',
          'bg-dark': '#1F2937',
          'border': '#E5E7EB',
          'text-primary': '#111827',
          'text-secondary': '#6B7280',
        },
        // Status colors for notifications, alerts, and badges
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },

      // --- TYPOGRAPHY ---
      // As defined in section 8.2 of your planning document
      fontFamily: {
        // Sets 'Inter' as the default sans-serif font
        sans: ['Inter', 'sans-serif'],
      },

      // --- SPACING ---
      // As defined in section 8.3 of your planning document
      // Tailwind's default spacing scale is already based on a 4px (0.25rem) unit.
      // The scale you provided (4, 8, 12, 16, 24, 32, 48, 64) corresponds
      // directly to Tailwind's default values (1, 2, 3, 4, 6, 8, 12, 16),
      // so no custom extension is needed here.
    },
  },

  // --- PLUGINS ---
  // Add official Tailwind plugins for enhanced functionality
  plugins: [
    require('@tailwindcss/forms'), // Provides better default styling for form elements
    require('@tailwindcss/aspect-ratio'), // Useful for maintaining aspect ratios on content cards
  ],
}
