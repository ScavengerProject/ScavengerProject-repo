/**
 * Formata progressivamente um telefone celular brasileiro no padrão
 * (99) 9 9999-9999 conforme o usuário digita. Ignora tudo que não for dígito
 * e limita a 11 (DDD + 9 + 8 dígitos do número).
 */
export function formatarTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11);

  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 3) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3, 7)}-${digitos.slice(7)}`;
}
