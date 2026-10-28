import { montarConteudo } from './conteudo';
import v1_0_0 from './versoes/1.0.0';

// Versões da central de ajuda, uma por versão do Arena. O sistema no ar é um
// só, então a ajuda padrão (/ajuda) é sempre a da versão ATUAL; as anteriores
// ficam como arquivo em /ajuda/v/<versao>, coerentes com o manual e os vídeos
// de cada uma. O seletor de versão só aparece quando há mais de uma.
//
// Para publicar uma versão nova (ex.: 1.1.0):
//   1. Copie ajuda/versoes/1.0.0 para ajuda/versoes/1.1.0 e mude `versao`,
//      `lancamento` e `novidades` no index.js da cópia.
//   2. Edite na cópia só os artigos que mudaram. Mantenha o mesmo slug para a
//      mesma função: é por ele que o seletor leva à mesma página na outra versão.
//   3. Prints novos vão em public/ajuda/1.1.0/; os que não mudaram, copie da
//      pasta da versão anterior.
//   4. Importe a versão aqui e coloque-a NO INÍCIO da lista. A primeira é a atual.
//   A pasta da versão anterior não é mais editada: ela descreve aquela versão.

// Monta as operações do registro a partir da lista de versões (a primeira é a
// atual). Exportada para os testes montarem um cenário com várias versões.
export function criarRegistro(versoes) {
  const atual = versoes[0];
  const buscarVersao = (versao) => versoes.find((conteudo) => conteudo.versao === versao);
  return {
    VERSOES: versoes,
    VERSAO_ATUAL: atual,
    temVariasVersoes: () => versoes.length > 1,
    buscarVersao,
    // Endereço de uma página da ajuda numa versão. A atual fica sem o prefixo,
    // para os links compartilhados continuarem apontando para a ajuda em vigor.
    caminhoAjuda(versao, slug) {
      const base = versao === atual.versao ? '/ajuda' : `/ajuda/v/${versao}`;
      return slug ? `${base}/${slug}` : base;
    },
  };
}

export const {
  VERSOES, VERSAO_ATUAL, temVariasVersoes, buscarVersao, caminhoAjuda,
} = criarRegistro([v1_0_0].map(montarConteudo));
