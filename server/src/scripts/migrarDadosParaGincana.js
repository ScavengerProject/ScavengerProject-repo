import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

import Gincana from '../models/Gincana.js';
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
 * Reatribui TODO o conteúdo existente (dados legados de 'GINCANA_PRINCIPAL' ou
 * documentos sem gincana_id) para uma gincana-destino.
 *
 * Use para consolidar o conteúdo do cluster de homologação dentro de uma única
 * gincana e visualizá-la isolada.
 *
 * Uso:
 *   node src/scripts/migrarDadosParaGincana.js <gincanaIdDestino>
 *
 * Onde <gincanaIdDestino> é o _id da gincana criada no painel (Gerenciar Gincanas).
 * Se omitido, usa 'GINCANA_PRINCIPAL' (útil só para materializar o campo nos
 * documentos que ainda não têm gincana_id, mantendo tudo na gincana legada).
 */

const LEGADO = 'GINCANA_PRINCIPAL';

// Coleções com gincana_id (String) e o rótulo para o log.
const COLECOES = [
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

const listarGincanas = async () => {
  const gincanas = await Gincana.find().select('_id nome ano status').sort({ criado_em: -1 });
  console.log('\nGincanas disponíveis (use o _id como argumento):');
  gincanas.forEach((g) => {
    console.log(`  _id=${g._id}  | ${g.nome} (${g.ano}) [${g.status}]`);
  });
  console.log('');
};

const migrar = async () => {
  const arg = process.argv[2];

  await connectDB();
  try {
    // Modo listagem: `node migrarDadosParaGincana.js --list`
    if (arg === '--list') {
      await listarGincanas();
      return;
    }

    const destino = arg || LEGADO;
    const gincana = await Gincana.findById(destino);
    if (!gincana) {
      console.error(`ERRO: Gincana destino '${destino}' não encontrada.`);
      await listarGincanas();
      return;
    }

    console.log(`Migrando todo o conteúdo existente para a gincana '${gincana.nome}' (_id=${destino})...\n`);

    // Filtro: documentos legados (gincana_id == 'GINCANA_PRINCIPAL') ou sem o campo.
    // Não toca em dados que já pertençam a OUTRA gincana.
    const filtro = { $or: [{ gincana_id: LEGADO }, { gincana_id: { $exists: false } }] };

    for (const [label, Model] of COLECOES) {
      // Não reescreve documentos que já estejam no destino.
      if (destino === LEGADO) {
        // Só materializa o campo em quem não tem.
        const r = await Model.updateMany(
          { gincana_id: { $exists: false } },
          { $set: { gincana_id: LEGADO } }
        );
        console.log(`  ${label.padEnd(26)} materializados: ${r.modifiedCount}`);
      } else {
        const r = await Model.updateMany(filtro, { $set: { gincana_id: destino } });
        console.log(`  ${label.padEnd(26)} reatribuídos: ${r.modifiedCount}`);
      }
    }

    console.log('\nMigração concluída.');
  } catch (error) {
    console.error('Erro durante a migração:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

migrar();
