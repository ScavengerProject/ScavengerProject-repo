import { ARTIGOS } from './artigos';
import { IMAGENS } from './imagens';

export default {
  versao: '1.1.0',
  lancamento: 'Novembro de 2026',
  // O que mudou em relação à versão anterior.
  // Formato: { tipo: 'novo' | 'mudou' | 'corrigido', texto, artigo? }
  novidades: [
    {
      tipo: 'novo',
      texto: 'Cerimônia de encerramento: o pódio revelado no telão, do último lugar até a equipe campeã.',
      artigo: 'cerimonia-de-encerramento',
    },
    {
      tipo: 'novo',
      texto: 'Os coordenadores recebem por email a colocação da equipe, e todos podem rever o resultado final.',
      artigo: 'resultado-final',
    },
    {
      tipo: 'mudou',
      texto: 'Encerrar uma gincana mostra antes a classificação que será congelada e quem vai receber o email.',
      artigo: 'gerenciar-gincanas',
    },
  ],
  artigos: ARTIGOS,
  imagens: IMAGENS,
};
