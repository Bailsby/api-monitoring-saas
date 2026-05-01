import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      semi: ['error', 'never'],
    },
  },
])
