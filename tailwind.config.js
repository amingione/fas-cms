/**** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* ───── Display Fonts ───── */
        captain: ['American Captain', 'sans-serif'],
        borg: ['Borgsquad Italic', 'sans-serif'],
        ethno: ['Ethnocentric', 'sans-serif'],
        'ethno-italic': ['Ethnocentric', 'sans-serif'],

        /* ───── Cyber Fonts ───── */
        cyber: ['Cyber Princess', 'sans-serif'],
        'cyber-italic': ['Cyber Princess Italic', 'sans-serif'],
        cyber3d: ['Cyber Princess 3D', 'sans-serif'],
        'cyber3d-italic': ['Cyber Princess 3D', 'sans-serif'],
        cyber3dfilled: ['Cyber Princess 3D Filled', 'sans-serif'],
        'cyber3dfilled-italic': ['Cyber Princess 3D Filled', 'sans-serif'],

        /* ───── Body / Auxiliary ───── */
        kwajong: ['Kwajong', 'sans-serif'],
        'kwajong-italic': ['Kwajong', 'sans-serif'],
        body: ['American Captain', 'sans-serif'],
      },
    },
    boxShadow: {
      'product-inset': 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
      'product-hover': '0 8px 20px rgba(0, 0, 0, 0.7)',
    },
  },
  plugins: [],
}

safelist: [
  {
    pattern: /delay-\[\d+ms\]/, // ensures delay-[100ms] etc. aren't purged
  },
],