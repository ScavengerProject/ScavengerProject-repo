import mongoose from 'mongoose';
import connectDB from '../config/db.js';

/**
 * Migra o antigo par fixo de bônus (`quesitos_de_avaliacao` + `configuracao_quesitos`,
 * só TEMPO/PRODUTIVIDADE) para `bonus_categorias`, a lista genérica de categorias
 * de bônus por prova (nome, pontos por unidade, teto de unidades).
 *
 * A antiga "pontuação extra" de TEMPO/PRODUTIVIDADE era um número livre digitado
 * pelo admin, sem teto aplicado (o `quantidade_minima`/`pontuacao_bonus`
 * configurados nunca eram lidos por `resultadoController.js`). A aproximação mais
 * próxima do comportamento antigo é uma categoria com `teto_unidades: 1`: o admin
 * continua digitando "1" para conceder o bônus configurado (`pontuacao_bonus`) ou
 * "0" para não conceder.
 *
 * Script idempotente: rodar mais de uma vez não duplica nem altera provas já
 * migradas (a segunda execução não encontra mais nenhum documento com os campos
 * legados).
 *
 * Uso (dentro de server/):
 *   npm run migrar:quesitos           -- migra e depois verifica
 *   npm run migrar:quesitos -- --check -- só verifica, não altera nada
 */
const apenasVerificar = process.argv.includes('--check');

const ROTULO_QUESITO = {
  TEMPO: 'Tempo de Execução',
  PRODUTIVIDADE: 'Produtividade/Volume',
};

// Gera as bonus_categorias equivalentes aos quesitos legados de um documento.
export const gerarBonusCategorias = (quesitosMarcados, configuracaoQuesitos) => {
  return (quesitosMarcados || [])
    .filter((chave) => ROTULO_QUESITO[chave])
    .map((chave) => ({
      chave,
      nome: ROTULO_QUESITO[chave],
      pontos_por_unidade: Number(configuracaoQuesitos?.[chave]?.pontuacao_bonus) || 0,
      teto_unidades: 1,
    }));
};

// Migra todos os documentos que ainda tem os campos legados.
export const migrar = async (colecao) => {
  const provas = await colecao
    .find({
      $or: [
        { quesitos_de_avaliacao: { $exists: true } },
        { configuracao_quesitos: { $exists: true } },
      ],
    })
    .toArray();

  for (const doc of provas) {
    const categoriasExistentes = doc.bonus_categorias || [];
    const chavesExistentes = new Set(categoriasExistentes.map((c) => c.chave));
    const novasCategorias = gerarBonusCategorias(
      doc.quesitos_de_avaliacao,
      doc.configuracao_quesitos
    ).filter((c) => !chavesExistentes.has(c.chave));

    await colecao.updateOne(
      { _id: doc._id },
      {
        $set: { bonus_categorias: [...categoriasExistentes, ...novasCategorias] },
        $unset: { quesitos_de_avaliacao: '', configuracao_quesitos: '' },
      }
    );
  }

  console.log(`Provas migradas: ${provas.length}.`);
  return provas.length;
};

// Confirma, documento a documento, que nenhuma prova ficou com os campos
// legados e que toda bonus_categorias tem o formato esperado pelo schema atual.
export const verificar = async (colecao) => {
  const provas = await colecao.find({}).toArray();

  let comCampoLegado = 0;
  let comBonusInvalida = 0;

  for (const doc of provas) {
    if (doc.quesitos_de_avaliacao !== undefined || doc.configuracao_quesitos !== undefined) {
      comCampoLegado += 1;
      console.warn(`  - Prova ${doc._id} (${doc.titulo}) ainda tem campo legado.`);
    }

    for (const categoria of doc.bonus_categorias || []) {
      const valida =
        typeof categoria.chave === 'string' && categoria.chave.length > 0 &&
        typeof categoria.nome === 'string' && categoria.nome.length > 0 &&
        typeof categoria.pontos_por_unidade === 'number';
      if (!valida) {
        comBonusInvalida += 1;
        console.warn(`  - Prova ${doc._id} (${doc.titulo}) tem categoria de bônus inválida: ${JSON.stringify(categoria)}`);
      }
    }
  }

  console.log(`Verificação: ${provas.length} prova(s) no total.`);
  console.log(`  Com campo legado ainda presente: ${comCampoLegado}`);
  console.log(`  Com bonus_categorias inválida: ${comBonusInvalida}`);

  return comCampoLegado === 0 && comBonusInvalida === 0;
};

const run = async () => {
  await connectDB();
  const colecao = mongoose.connection.collection('Provas');

  try {
    if (!apenasVerificar) {
      await migrar(colecao);
    }

    const semDivergencia = await verificar(colecao);
    if (!semDivergencia) {
      console.error('❌ Divergência encontrada — ver avisos acima.');
      process.exitCode = 1;
    } else {
      console.log('✅ Nenhuma divergência encontrada.');
    }
  } catch (error) {
    console.error('Erro ao migrar/verificar provas:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

// Só executa como CLI (evita rodar ao importar as funções em testes). Usa
// process.argv em vez de import.meta.url porque o Jest (via Babel) transforma
// este arquivo para CommonJS, que não suporta import.meta.
const isMainModule = process.argv[1]?.endsWith('migrarQuesitosParaBonusCategorias.js');
if (isMainModule) {
  run();
}
