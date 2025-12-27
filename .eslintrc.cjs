module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    '@typescript-eslint/no-unused-expressions': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-fallthrough': 'warn',
    'no-empty': 'off',
    'react/react-in-jsx-scope': 'off', // Astro/Next auto-imports React
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    // ❌ Block Stripe preview / experimental API versions in fas-cms
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "Property[key.name='apiVersion'] Literal[value=/\\.(basil|clover|preview|beta)$/]",
        message:
          '❌ Stripe preview API versions (.basil, .clover, .preview, .beta) are forbidden in fas-cms. Use a stable API version only.'
      }
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'stripe',
            importNames: ['LatestApiVersion'],
            message: '❌ Stripe.LatestApiVersion is forbidden in fas-cms. Stable API versions only.'
          }
        ]
      }
    ]
  },
  ignorePatterns: ['dist/', 'node_modules/', 'public/', 'src/**/*']
};
