import colors from 'tailwindcss/colors';

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,css}',
    './components/**/*.{astro,html,js,jsx,ts,tsx}',
    './layouts/**/*.{astro,html,js,jsx,ts,tsx}',
    './pages/**/*.{astro,html,js,jsx,ts,tsx}'
  ],
  safelist: [
    'font-captain',
    'font-borg',
    'font-borg-italic',
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
    'font-body'
  ],
  theme: {
    // Mobile-first screens mapped to your Figma breakpoints
    screens: {
      // base: <640px
      sm: '640px', // phones → small tablets
      md: '768px', // tablets portrait
      lg: '1024px', // tablets landscape / small laptop
      xl: '1280px', // desktop
      '2xl': '1536px'
    },

    // Centered container with mobile padding by default
    container: {
      center: true,
      padding: {
        DEFAULT: '0px', // 16px mobile gutters
        sm: '0px', // 20px
        md: '0px', // 24px
        lg: '0px', // 32px
        xl: '0px', // 40px
        '2xl': '0px' // 48px
      }
    },

    extend: {
      colors: {
        // Brand palette used by utilities like text-primary, bg-accent, etc.
        primary: '#ea1d26',
        'primary-hover': '#c91820',
        'fas-red': '#ea1d26',
        'fas-red-dark': '#c91820',
        secondary: '#eef2fb',
        red: '#7d0107',
        accent: '#fde4b2',
        primaryB: '#7d0107',
        'accent-foreground': '#030213',
        // Site background utility color
        background: '#121212)',
        // Normalize common dark shades to your base background (if you want pure black globally)
        gray: { ...colors.gray, 900: '#111111' },
        offwhite: '#FDE4B2',
        neutral: { ...colors.neutral, 900: '#121212)' },
        zinc: { ...colors.zinc, 900: '#121212)' }
      },
      // Keep your existing font stacks
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
        body: ['American Captain', 'sans-serif']
      },

      // Mobile-first type scale (smaller base, scales up on breakpoints)
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.15' }], // 12px
        sm: ['0.8125rem', { lineHeight: '1.2' }], // 13px
        base: ['0.875rem', { lineHeight: '1.3' }], // 14px mobile base
        lg: ['1rem', { lineHeight: '1.3' }], // 16px
        xl: ['1.125rem', { lineHeight: '1.25' }], // 18px
        '2xl': ['1.25rem', { lineHeight: '1.2' }],
        '3xl': ['1.5rem', { lineHeight: '1.2' }],
        '4xl': ['1.875rem', { lineHeight: '1.1' }],
        '5xl': ['2.25rem', { lineHeight: '1.05' }]
      },

      // Roundness defaults for a sleeker mobile look
      borderRadius: {
        sm: '0.375rem', // 6px
        DEFAULT: '0.5rem', // 8px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.25rem',
        '2xl': '1.5rem',
        full: '9999px',
        card: '16px'
      },

      // Shadows for product and hover (kept from your config)
      boxShadow: {
        'product-inset': 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
        'product-hover': '0 8px 20px rgba(0, 0, 0, 0.7)',
        card: '0 24px 20px 8px rgba(0,0,0,0.4), inset 0 2px 0 rgba(184,180,180,0.08)',
        glow: '0 0 6px rgba(255,255,255,0.6)'
      }
    }
  }
};
