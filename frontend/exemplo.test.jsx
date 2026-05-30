import { describe, it, expect } from 'vitest';

describe('Meu Primeiro Arquivo de Teste', () => {
  
  it('A matemática básica deve funcionar (1 + 1 = 2)', () => {
    // Aqui criamos uma regra: Esperamos que 1 + 1 seja igual a 2
    expect(1 + 1).toBe(2);
  });

});