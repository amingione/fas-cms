module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(import.meta.env.NODE_ENV === 'production' ? { cssnano: {} } : {})
  }
};
