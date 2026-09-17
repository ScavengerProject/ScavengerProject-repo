import mongoose from 'mongoose';
import connectDB from '../config/db.js';

/**
 * Converte o status SUSPENSO (removido do sistema) em INATIVO.
 *
 * SUSPENSO nunca teve comportamento próprio: `resolverEscola` tratava
 * INATIVO/SUSPENSO/BANIDO no mesmo ramo, e a única regra que o citava
 * (participação em prova) já cobria BANIDO junto. Restaram dois estados com
 * significado de verdade — INATIVO (desativação administrativa, reversível) e
 * BANIDO (decisão disciplinar) — e SUSPENSO virou sinônimo do primeiro.
 *
 * Por que o script é obrigatório e não cosmético: o enum do schema não aceita
 * mais 'SUSPENSO'. Um documento que ainda carregue esse valor passa a falhar na
 * validação no PRÓXIMO save do usuário (mudar o papel, entrar numa equipe,
 * aprovar um vínculo), com um ValidationError que não diz nada sobre status.
 * Rodar isto antes de subir a versão evita esse erro tardio.
 *
 * Mexe nos dois lugares onde o status vive:
 *  - `vinculos[].status` — o que vale hoje (status é por escola);
 *  - `status` — o campo base/legado, das instalações anteriores ao multi-escola.
 *
 * Idempotente: a segunda execução não encontra mais nenhum documento.
 *
 * Uso (dentro de server/):
 *   npm run migrar:suspenso             -- migra e depois verifica
 *   npm run migrar:suspenso -- --check  -- só verifica, não altera nada
 */
const apenasVerificar = process.argv.includes('--check');

export const migrar = async (colecao) => {
  // Os dois campos são atualizados separadamente: o filtro posicional `$` só
  // alcança o PRIMEIRO vínculo que casa, então vínculos suspensos são migrados
  // em laço até não sobrar nenhum (um usuário pode ter mais de um).
  const base = await colecao.updateMany(
    { status: 'SUSPENSO' },
    { $set: { status: 'INATIVO' } }
  );

  let vinculosMigrados = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await colecao.updateMany(
      { 'vinculos.status': 'SUSPENSO' },
      { $set: { 'vinculos.$[alvo].status': 'INATIVO' } },
      { arrayFilters: [{ 'alvo.status': 'SUSPENSO' }] }
    );
    vinculosMigrados += res.modifiedCount;
    if (res.modifiedCount === 0) break;
  }

  console.log(`Status base migrados (SUSPENSO -> INATIVO): ${base.modifiedCount}.`);
  console.log(`Usuários com vínculo(s) migrado(s): ${vinculosMigrados}.`);
  return base.modifiedCount + vinculosMigrados;
};

export const verificar = async (colecao) => {
  const comBase = await colecao.countDocuments({ status: 'SUSPENSO' });
  const comVinculo = await colecao.countDocuments({ 'vinculos.status': 'SUSPENSO' });

  console.log(`Verificação: ${comBase} usuário(s) com status base SUSPENSO, `
    + `${comVinculo} com vínculo SUSPENSO.`);

  return comBase === 0 && comVinculo === 0;
};

const run = async () => {
  await connectDB();
  const colecao = mongoose.connection.collection('Usuarios');

  try {
    if (!apenasVerificar) {
      await migrar(colecao);
    }

    const semDivergencia = await verificar(colecao);
    if (!semDivergencia) {
      console.error('❌ Ainda há documentos com SUSPENSO — ver acima.');
      process.exitCode = 1;
    } else {
      console.log('✅ Nenhum SUSPENSO restante.');
    }
  } catch (error) {
    console.error('Erro ao migrar status SUSPENSO:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

// Só executa quando chamado direto (permite importar as funções nos testes).
if (process.argv[1] && process.argv[1].includes('migrarStatusSuspenso')) {
  run();
}
