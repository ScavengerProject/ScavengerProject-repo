import crypto from 'crypto';
import CodigoConvite from '../models/CodigoConvite.js';

// Crockford Base32: exclui O/I/L/U para não confundir dígitos e letras na
// hora de um humano digitar o código (0/O, 1/I/L são os pares clássicos).
// "0123456789ABCDEFGHJKMNPQRSTVWXYZ" tem exatamente 32 símbolos.
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TAMANHO_CODIGO = 8;
const TENTATIVAS_MAX = 5;

/**
 * Gera um código de convite novo, único no banco.
 *
 * Colisão é extremamente improvável (32^8 combinações), mas o retry existe
 * para não deixar a criação do convite falhar por um acaso estatístico em vez
 * de tentar de novo silenciosamente.
 *
 * @returns {Promise<string>}
 */
export async function gerarCodigo() {
  for (let tentativa = 0; tentativa < TENTATIVAS_MAX; tentativa += 1) {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i += 1) {
      codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
    }

    // eslint-disable-next-line no-await-in-loop
    const existe = await CodigoConvite.exists({ codigo });
    if (!existe) return codigo;
  }

  throw new Error('Não foi possível gerar um código de convite único. Tente novamente.');
}

/**
 * Normaliza um código digitado por um humano antes de qualquer consulta:
 * remove espaços/hífens, uppercase, e mapeia os pares visualmente ambíguos
 * (O->0, I/L->1, U->V) para o alfabeto canônico do gerador.
 *
 * TODA entrada de código de convite (prevalidação, registro, resgate) precisa
 * passar por aqui antes de bater no banco — inclusive um código gerado por
 * este mesmo módulo, que já está no alfabeto canônico e passa incólume.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizarCodigo(input) {
  if (!input) return '';

  return String(input)
    .trim()
    .toUpperCase()
    .replace(/[-\s]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');
}
