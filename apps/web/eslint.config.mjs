import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import next from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...next,

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  {
    languageOptions: {
      globals: globals.browser,
    },
  },
])
