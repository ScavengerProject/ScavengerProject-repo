import { describe, it, expect } from 'vitest';
import { cn } from './utils';

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
