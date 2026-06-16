import { defineConfig } from 'vitest/config';

// Configuração dos testes do frontend (Vitest + Testing Library + jsdom).
export default defineConfig({
  // Usa o runtime automático de JSX (React 19), dispensando importar React nos testes.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      // O gate de cobertura foca na camada de lógica e nos componentes-chave testados.
      include: [
        'src/lib/**/*.{js,jsx}',
        'src/services/**/*.{js,jsx}',
        'src/hooks/**/*.{js,jsx}',
        'src/components/ProtectedRoute.jsx',
      ],
      // statements/branches/lines são o sinal principal aqui. "functions" fica baixo
      // porque services/api.js é dominado por dezenas de wrappers triviais de 1 linha
      // (passthroughs), cuja lógica central (request) já é coberta pelos statements.
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 12,
        lines: 60,
      },
    },
  },
});
