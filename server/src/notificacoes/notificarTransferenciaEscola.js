import Gincana from '../models/Gincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import EquipeGincana from '../models/EquipeGincana.js';
import { gincanaEncerrada } from '../gincanas/gincanaHelpers.js';
import { getCoordenadoresIdsDaEquipe } from '../equipes/coordenadorEquipe.js';
import { criarNotificacao } from './notificacaoController.js';

/**
 * Notifica o(s) coordenador(es) de origem quando um usuário transferido de
 * escola ainda era membro ativo de uma gincana não encerrada daquela escola.
 *
 * Compartilhado entre `conviteController.decidirPendencia` (transferência via
 * código de convite / vínculo PENDENTE) e `escolaController.vincularUsuario`
 * (transferência administrativa direta pelo SUPER_ADMIN) — ver plano de
 * convites, Fase 0.
 *
 * Deliberadamente NÃO mexe em EquipeMembros: sem vínculo com a escola de
 * origem, `resolverGincana` já bloqueia o acesso àquela gincana, e a linha de
 * membro preserva o histórico da edição encerrada. Falhas aqui não podem
 * derrubar quem chamou — é só um aviso, sempre usado como best-effort.
 */
export async function notificarCoordenadoresDeOrigem(usuario, escolaOrigemId) {
  const gincanasOrigem = await Gincana.find({ escola_id: escolaOrigemId }).select('_id status ano');
  const gincanaIdsAtivas = gincanasOrigem.filter((g) => !gincanaEncerrada(g)).map((g) => g._id);
  if (gincanaIdsAtivas.length === 0) return;

  const equipeIdsMestre = await EquipeMembros.find({ usuario_id: usuario._id }).distinct('equipe_id');
  if (equipeIdsMestre.length === 0) return;

  const participacoes = await EquipeGincana
    .find({ equipe_id: { $in: equipeIdsMestre }, gincana_id: { $in: gincanaIdsAtivas } })
    .populate('equipe_id', 'nome');

  for (const eg of participacoes) {
    // eslint-disable-next-line no-await-in-loop
    const coordenadores = await getCoordenadoresIdsDaEquipe(eg);
    const destinatarios = coordenadores.filter((id) => String(id) !== String(usuario._id));

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(destinatarios.map((coordId) => criarNotificacao(
      coordId,
      'COMUNICADO',
      'Membro transferido de escola',
      `${usuario.nome} foi transferido(a) para outra escola e não faz mais parte da equipe "${eg.equipe_id?.nome || ''}" nesta edição.`,
      null,
      usuario._id,
      eg.gincana_id,
    )));
  }
}
