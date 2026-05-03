import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/test/**',
        'src/test/mocks/**',
      ],
    },
  },
})
