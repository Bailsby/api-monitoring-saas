import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  // Build output and coverage reports are generated, not authored.
  {
    ignores: ['dist/**', 'coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      semi: ['error', 'never'],
    },
  },
])
