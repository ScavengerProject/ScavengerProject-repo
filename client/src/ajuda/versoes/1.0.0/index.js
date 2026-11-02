import { ARTIGOS } from './artigos';
import { IMAGENS } from './imagens';

export default {
  versao: '1.0.0',
  lancamento: 'Outubro de 2026',
  // O que mudou em relação à versão anterior. A 1.0.0 é a primeira, então não
  // há o que listar. Formato: { tipo: 'novo' | 'mudou' | 'corrigido', texto, artigo? }
  novidades: [],
  artigos: ARTIGOS,
  imagens: IMAGENS,
};
