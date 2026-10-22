import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { cn, emailQuebravel } from './utils';

describe('cn (merge de classes)', () => {
  it('junta classes simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignora valores falsy (condicionais)', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('resolve conflitos do Tailwind mantendo a última classe', () => {
    // twMerge: a última utilidade do mesmo grupo vence
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('emailQuebravel', () => {
  it('põe um ponto de quebra (<wbr>) antes do arroba, sem mudar o texto', () => {
    const { container } = render(createElement('p', null, emailQuebravel('fulano@gmail.com')));
    expect(container.textContent).toBe('fulano@gmail.com');
    expect(container.querySelector('wbr')).not.toBeNull();
  });

  it('devolve como veio o que não é e-mail', () => {
    expect(emailQuebravel(undefined)).toBeUndefined();
    expect(emailQuebravel('sem-arroba')).toBe('sem-arroba');
  });
});
