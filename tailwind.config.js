module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}',
  ],
  safelist: [
    'font-captain',
    'font-borg',
    'font-ethno',
    'font-ethno-italic',
    'font-cyber',
    'font-cyber-italic',
    'font-cyber3d',
    'font-cyber3d-italic',
    'font-cyber3dfilled',
    'font-cyber3dfilled-italic',
    'font-kwajong',
    'font-kwajong-italic',
    'font-body',
  ],
  theme: {
    extend: {
      fontFamily: {
        captain: ['American Captain', 'sans-serif'],
        borg: ['Borgsquad Italic', 'sans-serif'],
        ethno: ['Ethnocentric', 'sans-serif'],
        'ethno-italic': ['Ethnocentric', 'sans-serif'],
        cyber: ['Cyber Princess', 'sans-serif'],
        'cyber-italic': ['Cyber Princess Italic', 'sans-serif'],
        cyber3d: ['Cyber Princess 3D', 'sans-serif'],
        'cyber3d-italic': ['Cyber Princess 3D', 'sans-serif'],
        cyber3dfilled: ['Cyber Princess 3D Filled', 'sans-serif'],
        'cyber3dfilled-italic': ['Cyber Princess 3D Filled', 'sans-serif'],
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
  }