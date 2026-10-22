import mongoose from 'mongoose';
import connectDB from '../config/db.js';

/**
 * Converte o teto das provas por unidade (PROPORCIONAL) de PONTOS para UNIDADES.
 *
 * O teto antigo, `pontuacao.limite_pontuacao_porcoes`, era um máximo de pontos;
 * o das categorias de bônus (`teto_unidades`) é um máximo de unidades. Ter o
 * mesmo campo em medidas diferentes confundia quem cria a prova, então os dois
 * passaram a ser em unidades: `pontuacao.teto_unidades`.
 *
 * Só converte quando a divisão é exata (500 pts a 50 pts/un = 10 unidades),
 * porque aí o resultado é idêntico. Uma divisão quebrada (500 pts a 30 pts/un)
 * mudaria a pontuação de qualquer lançamento refeito, então a prova fica como
 * está e aparece no relatório para o admin decidir; enquanto isso o backend
 * continua aplicando o teto antigo (ver `pontuarPorUnidade`).
 *
 * Script idempotente: a segunda execução só reencontra as provas pendentes, e
 * as deixa como estão de novo.
 *
 * Uso (dentro de server/):
 *   npm run migrar:teto-unidades           -- migra e depois verifica
 *   npm run migrar:teto-unidades -- --check -- só verifica, não altera nada
 */
const apenasVerificar = process.argv.includes('--check');

const FILTRO_TETO_LEGADO = { 'pontuacao.limite_pontuacao_porcoes': { $exists: true } };

/**
 * Decide o que fazer com a pontuação de uma prova que tem o teto antigo.
 * @returns {{ acao: 'converter', teto_unidades: number } | { acao: 'remover' } | { acao: 'pendente', motivo: string }}
 */
export const planejarConversao = (pontuacao) => {
  const limite = Number(pontuacao?.limite_pontuacao_porcoes) || 0;
  const pontosPorUnidade = Number(pontuacao?.pontos_por_unidade) || 0;

  // Sem teto de fato (0/null), ou já convertida: o teto em unidades é o que vale.
  if (limite <= 0 || pontuacao?.teto_unidades != null) return { acao: 'remover' };

  if (pontosPorUnidade <= 0) {
    return { acao: 'pendente', motivo: 'prova sem pontos por unidade' };
  }
  if (limite % pontosPorUnidade !== 0) {
    return {
      acao: 'pendente',
      motivo: `${limite} pts não é múltiplo de ${pontosPorUnidade} pts por unidade`,
    };
  }
  return { acao: 'converter', teto_unidades: limite / pontosPorUnidade };
};

export const migrar = async (colecao) => {
  const provas = await colecao.find(FILTRO_TETO_LEGADO).toArray();
  const pendentes = [];
  let convertidas = 0;

  for (const doc of provas) {
    const plano = planejarConversao(doc.pontuacao);

    if (plano.acao === 'pendente') {
      pendentes.push({ id: doc._id, titulo: doc.titulo, motivo: plano.motivo });
      continue;
    }

    const update = { $unset: { 'pontuacao.limite_pontuacao_porcoes': '' } };
    if (plano.acao === 'converter') {
      update.$set = { 'pontuacao.teto_unidades': plano.teto_unidades };
    }
    await colecao.updateOne({ _id: doc._id }, update);
    convertidas += 1;
  }

  console.log(`Provas convertidas: ${convertidas}. Pendentes: ${pendentes.length}.`);
  return { convertidas, pendentes };
};

// Confirma que todo teto em unidades é um número válido e lista as provas que
// ainda estão no teto antigo. Pendentes não são divergência: o backend ainda as
// pontua corretamente, só falta o admin escolher o número de unidades.
export const verificar = async (colecao) => {
  const provas = await colecao.find({}).toArray();
  let tetoInvalido = 0;
  let pendentes = 0;

  for (const doc of provas) {
    const teto = doc.pontuacao?.teto_unidades;
    if (teto != null && !(typeof teto === 'number' && teto >= 0)) {
      tetoInvalido += 1;
      console.warn(`  - Prova ${doc._id} (${doc.titulo}) tem teto_unidades inválido: ${JSON.stringify(teto)}`);
    }
    if (doc.pontuacao?.limite_pontuacao_porcoes !== undefined) {
      pendentes += 1;
      const { motivo } = planejarConversao(doc.pontuacao);
      console.warn(`  - Prova ${doc._id} (${doc.titulo}) ainda usa o teto em pontos${motivo ? `: ${motivo}` : ''}. Edite a prova e informe o máximo de unidades.`);
    }
  }

  console.log(`Verificação: ${provas.length} prova(s) no total.`);
  console.log(`  Com teto_unidades inválido: ${tetoInvalido}`);
  console.log(`  Ainda com teto em pontos (revisar manualmente): ${pendentes}`);

  return tetoInvalido === 0;
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
const isMainModule = process.argv[1]?.endsWith('migrarTetoUnidades.js');
if (isMainModule) {
  run();
}
