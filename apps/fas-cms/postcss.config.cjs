module.exports = {
  plugins: {
    'tailwindcss/nesting': {}, // official nesting plugin; must be before tailwind
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  }
};
