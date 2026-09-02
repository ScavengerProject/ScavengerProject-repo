import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Escola from '../models/Escola.js';
import Gincana from '../models/Gincana.js';
import Usuario, { podeMultiEscola } from '../models/Usuario.js';
import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import Resultado from '../models/Resultado.js';
import Feedback from '../models/Feedback.js';
import ConfiguracaoGincana from '../models/ConfiguracaoGincana.js';
import Prova from '../models/Prova.js';
import ProvaUsuario from '../models/ProvaUsuario.js';
import ProvaEquipeParticipacao from '../models/ProvaEquipeParticipacao.js';
import Penalidade from '../models/Penalidade.js';
import Notificacao from '../models/Notificacao.js';
import MigracaoEquipe from '../models/MigracaoEquipe.js';
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import SolicitacaoEmprestimo from '../models/SolicitacaoEmprestimo.js';
import OfertaEmprestimo from '../models/OfertaEmprestimo.js';

dotenv.config();

/**
 * Auditoria SÓ LEITURA do estado do banco em relação ao schema multi-escola/
 * multi-gincana. Não grava nada — nem sync de índices (por isso não usa
 * connectDB(), que faz Gincana.syncIndexes() na conexão).
 *
 * Serve para decidir se dá pra remover os defaults de fallback
 * ('GINCANA_PRINCIPAL'/'ESCOLA_PRINCIPAL') dos models (deixando o `required`
 * valer de verdade) sem quebrar nada: hoje esses defaults são uma rede de
 * segurança permanente que mascara qualquer controller que esqueça de setar
 * o escopo, gravando silenciosamente no tenant legado em vez de falhar.
 *
 * Uso: node src/scripts/auditarEscopo.js
 * (por padrão usa MONGO_URI_DEV — mesma regra de ambiente do connectDB())
 */

const COLECOES_POR_GINCANA = [
  ['Equipe', Equipe],
  ['EquipeGincana', EquipeGincana],
  ['Resultado', Resultado],
  ['Feedback', Feedback],
  ['ConfiguracaoGincana', ConfiguracaoGincana],
  ['Prova', Prova],
  ['ProvaUsuario', ProvaUsuario],
  ['ProvaEquipeParticipacao', ProvaEquipeParticipacao],
  ['Penalidade', Penalidade],
  ['Notificacao', Notificacao],
  ['MigracaoEquipe', MigracaoEquipe],
  ['EmprestimoEquipe', EmprestimoEquipe],
  ['SolicitacaoEmprestimo', SolicitacaoEmprestimo],
  ['OfertaEmprestimo', OfertaEmprestimo],
];

async function conectar() {
  const ambiente = process.env.NODE_ENV || 'development';
  if (ambiente === 'production') {
    console.error(
      'ERRO: recusando rodar com NODE_ENV=production. Esta auditoria é para o ' +
      'banco de desenvolvimento (MONGO_URI_DEV) — rode com NODE_ENV=development.'
    );
    process.exit(1);
  }

  const uri = process.env.MONGO_URI_DEV;
  if (!uri) {
    console.error('ERRO: MONGO_URI_DEV não definida no .env.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Conectado (ambiente: ${ambiente}, só leitura).`);
}

const linha = (titulo) => console.log(`\n=== ${titulo} ===`);

async function auditarEscolas() {
  linha('Escolas');
  const escolas = await Escola.find().select('_id nome status').lean();
  console.log(`Total: ${escolas.length}`);
  return escolas;
}

async function auditarGincanas(escolaIds) {
  linha('Gincanas');
  const gincanas = await Gincana.find().select('_id nome ano status escola_id').lean();
  console.log(`Total: ${gincanas.length}`);

  const orfas = gincanas.filter((g) => !escolaIds.has(String(g.escola_id)));
  if (orfas.length > 0) {
    console.warn(`⚠ ${orfas.length} gincana(s) com escola_id que não existe:`);
    orfas.forEach((g) => console.warn(`  - ${g.nome} (${g.ano}) _id=${g._id} escola_id=${g.escola_id}`));
  } else {
    console.log('OK: todas as gincanas têm escola_id válido.');
  }

  return gincanas.map((g) => String(g._id));
}

async function auditarColecoesEscopadas(gincanaIds) {
  linha('Coleções escopadas por gincana_id');
  const gincanaIdsSet = new Set(gincanaIds);

  for (const [label, Model] of COLECOES_POR_GINCANA) {
    const total = await Model.countDocuments();
    const semCampo = await Model.countDocuments({ gincana_id: { $exists: false } });
    const distinctIds = await Model.distinct('gincana_id');
    const idsOrfaos = distinctIds.filter((id) => !gincanaIdsSet.has(String(id)));
    const countOrfaos = idsOrfaos.length > 0
      ? await Model.countDocuments({ gincana_id: { $in: idsOrfaos } })
      : 0;

    const flags = [];
    if (semCampo > 0) flags.push(`${semCampo} sem gincana_id`);
    if (countOrfaos > 0) flags.push(`${countOrfaos} apontando p/ gincana inexistente (${idsOrfaos.join(', ')})`);

    const status = flags.length ? `⚠ ${flags.join('; ')}` : 'OK';
    console.log(`${label.padEnd(26)} total=${String(total).padStart(6)}  ${status}`);
  }
}

async function auditarUsuarios() {
  linha('Usuários');
  const total = await Usuario.countDocuments();
  console.log(`Total: ${total}`);

  // Campo legado 'escolas' (pré multi-escola): não existe mais no schema, lê via driver puro.
  const colecao = mongoose.connection.collection('Usuarios');
  const comCampoLegado = await colecao.countDocuments({ escolas: { $exists: true } });
  console.log(comCampoLegado > 0
    ? `⚠ ${comCampoLegado} usuário(s) ainda com o campo legado 'escolas' (rode migrar:papeis).`
    : "OK: ninguém com o campo legado 'escolas'.");

  const semVinculoNemSuperAdmin = await Usuario.countDocuments({
    tipo: { $ne: 'SUPER_ADMIN' },
    $or: [{ vinculos: { $exists: false } }, { vinculos: { $size: 0 } }],
  });
  console.log(semVinculoNemSuperAdmin > 0
    ? `⚠ ${semVinculoNemSuperAdmin} usuário(s) sem SUPER_ADMIN e sem nenhum vínculo de escola (sem acesso a nada).`
    : 'OK: todo mundo, fora SUPER_ADMIN, tem ao menos um vínculo.');

  // Escola única: perfis fora de PERFIS_MULTI_ESCOLA não podem ter mais de um
  // vínculo efetivo (PENDENTE não conta — é só uma solicitação).
  const candidatos = await Usuario.find({ 'vinculos.1': { $exists: true } }).select('_id nome email vinculos').lean();
  const violando = candidatos.filter((u) => {
    const efetivos = (u.vinculos || []).filter((v) => v.status !== 'PENDENTE');
    if (efetivos.length <= 1) return false;
    return efetivos.some((v) => !podeMultiEscola(v.tipo));
  });
  if (violando.length > 0) {
    console.warn(`⚠ ${violando.length} usuário(s) com perfil de escola única em mais de uma escola:`);
    violando.forEach((u) => console.warn(`  - ${u.nome} (${u.email})`));
  } else {
    console.log('OK: ninguém com perfil de escola única vinculado a mais de uma escola.');
  }
}

async function auditarEquipes() {
  linha('Equipes / EquipeGincana');
  const equipesGincana = await EquipeGincana.find().select('_id equipe_id gincana_id').lean();
  const equipeIds = [...new Set(equipesGincana.map((eg) => String(eg.equipe_id)))];
  const equipesExistentes = await Equipe.find({ _id: { $in: equipeIds } }).select('_id gincana_id').lean();
  const equipePorId = new Map(equipesExistentes.map((e) => [String(e._id), e]));

  let orfas = 0;
  let divergentes = 0;
  for (const eg of equipesGincana) {
    const equipe = equipePorId.get(String(eg.equipe_id));
    if (!equipe) {
      orfas += 1;
      continue;
    }
    if (String(equipe.gincana_id) !== String(eg.gincana_id)) {
      divergentes += 1;
    }
  }

  console.log(`Total EquipeGincana: ${equipesGincana.length}`);
  console.log(orfas > 0
    ? `⚠ ${orfas} EquipeGincana apontando para uma Equipe (mestre) inexistente.`
    : 'OK: toda EquipeGincana tem a Equipe correspondente.');
  console.log(divergentes > 0
    ? `⚠ ${divergentes} EquipeGincana com gincana_id diferente do Equipe.gincana_id.`
    : 'OK: gincana_id bate entre Equipe e EquipeGincana em todos os registros.');
}

async function main() {
  await conectar();
  try {
    const escolas = await auditarEscolas();
    const escolaIds = new Set(escolas.map((e) => String(e._id)));

    const gincanaIds = await auditarGincanas(escolaIds);
    await auditarColecoesEscopadas(gincanaIds);
    await auditarUsuarios();
    await auditarEquipes();

    console.log('\nAuditoria concluída — só leitura, nada foi alterado.');
  } finally {
    await mongoose.disconnect();
  }
}

main();
