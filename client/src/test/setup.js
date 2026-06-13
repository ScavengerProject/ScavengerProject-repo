// Setup global dos testes do frontend.
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Desmonta a árvore React e limpa o localStorage entre os testes.
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});
