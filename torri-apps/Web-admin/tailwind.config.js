const withMT = require("@material-tailwind/react/utils/withMT");

/** @type {import('tailwindcss').Config} */
module.exports = withMT({ // Wrapped with withMT
  content: [
    './index.html', 
    './Src/**/*.{js,jsx,ts,tsx}' // Corrected path to Src
  ],
  theme: {
    extend: {
      // Add custom theme extensions here if needed later
      // e.g., colors: { 'brand-blue': '#007bff', }
    },
  },
  plugins: [
    // Other plugins can be added here
  ],
});
