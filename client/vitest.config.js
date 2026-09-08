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
      // O gate mede TODO o src/. Antes media so um slice (lib, services, hooks e
      // ProtectedRoute) - 7 dos 74 arquivos - e reportava ~78%, ignorando as 42
      // paginas e 28 componentes. Pior: os testes de pagina que ja existiam nao
      // contavam para a metrica.
      include: ['src/**/*.{js,jsx}'],

      // So statements/lines. Medido em 2026-09-07: 12.75% (2.077/16.294 linhas,
      // 54 dos 74 arquivos sem nenhuma cobertura). A queda de "78%" para 12.75%
      // NAO e regressao - e a correcao da base de medicao.
      //
      // branches/functions ficam DE FORA de proposito: o provider v8 so registra
      // branch/function de arquivos que algum teste importou. Os 54 arquivos
      // nunca carregados entram com 0 linhas cobertas mas nao somam branches nem
      // funcoes ao denominador (dai o irreal "69% de branches" sobre apenas 414
      // branches em 16 mil linhas). Fixa-los geraria falha fantasma toda vez que
      // um arquivo novo passasse a ser importado por um teste.
      thresholds: {
        statements: 11,
        lines: 11,
      },
    },
  },
});
