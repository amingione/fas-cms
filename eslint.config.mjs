import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'public/**/*',
      'src/components/BookingConfirm.jsx',
      'src/pages/api/save-order.ts',
      'src/pages/api/save-quote.ts'
    ]
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ...js.configs.recommended
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: [
      'src/components/storefront/ProductCardLiteReact.tsx',
      'src/components/storefront/label.tsx'
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXOpeningElement[name.name=/^(div|p|span|h[1-6])$/] > JSXAttribute[name.name='className'][value.type='Literal'][value.value=/\\bflex\\b/][value.value=/\\btext-[^\\s]+/]:not([value.value=/\\bmin-w-0\\b/])",
          message: 'Flex text containers should include min-w-0 to prevent truncation.'
        }
      ]
    }
  },
  {
    ...pluginReact.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off'
    }
  }
]);
