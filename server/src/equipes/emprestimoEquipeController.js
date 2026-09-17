// src/equipes/emprestimoEquipeController.js
import EmprestimoEquipe from '../models/EmprestimoEquipe.js';
import EquipeMembro from '../models/EquipeMembros.js';
import Prova from '../models/Prova.js';
import { getEquipesGincanaDoCoordenador } from './coordenadorEquipe.js';
import { usuarioDaEscola } from '../escolas/escolaHelpers.js';

// Escopo da gincana ativa (injetado por resolverGincana; fallback p/ gincana legada).
const escopoGincana = (req) => req.gincanaId || 'GINCANA_PRINCIPAL';

// Campos de populate para devolver nomes úteis no front.
// `vinculos` entra no select do emprestado porque é de lá que saem papel e
// turma da escola ativa (ver comTurmaDoEmprestado).
const basePopulate = [
  { path: 'usuario_id', select: 'nome email tipo turma vinculos' },
  {
    path: 'equipe_origem_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  {
    path: 'equipe_destino_id',
    populate: { path: 'equipe_id', model: 'Equipe', select: 'nome cor' },
  },
  { path: 'prova_id', select: 'titulo descricao data_inicio data_fim' },
  { path: 'criado_por', select: 'nome email tipo' },
  { path: 'encerrado_por', select: 'nome email tipo' },
];

/**
 * Projeta o emprestado no papel/turma da ESCOLA ATIVA.
 *
 * O populate trazia só `nome email tipo`: a tela de empréstimos mostrava
 * "Sem turma" para todo mundo porque o campo nem vinha. Acrescentar `turma` ao
 * select não bastaria — o campo de topo é legado e fica null para quem entrou
 * por convite; a turma real está no vínculo (ver usuarioDaEscola).
 */
const comTurmaDoEmprestado = (emprestimoOuLista, escolaId) => {
  const achatar = (emprestimo) => {
    if (!emprestimo) return emprestimo;
    const obj = typeof emprestimo.toObject === 'function' ? emprestimo.toObject() : { ...emprestimo };
    if (obj.usuario_id?.vinculos) obj.usuario_id = usuarioDaEscola(obj.usuario_id, escolaId);
    return obj;
  };

  return Array.isArray(emprestimoOuLista)
    ? emprestimoOuLista.map(achatar)
    : achatar(emprestimoOuLista);
};

/**
 * Não existe criação avulsa de empréstimo.
 *
 * O empréstimo é o RESULTADO do acordo entre dois coordenadores — solicitação
 * (aprovada pelo ADMIN) -> oferta -> aceite do solicitante, em
 * `ofertaEmprestimoController.aceitarOferta`, o único lugar que cria um
 * `EmprestimoEquipe`. O antigo `POST /api/equipes/emprestimos` deixava o ADMIN
 * mover um aluno de equipe direto, sem solicitação, sem oferta e sem nenhum dos
 * dois coordenadores saber: o papel dele no fluxo é aprovar ou rejeitar a
 * solicitação, e encerrar um empréstimo em curso.
 */

// [GET] /api/equipes/emprestimos
// filtros opcionais: ?status=ATIVO|ENCERRADO|CANCELADO&provaId=...&usuarioId=...
// ADMIN vê tudo; COORDENADOR vê apenas empréstimos onde origem OU destino sejam equipes que coordena
export const listarEmprestimos = async (req, res) => {
  try {
    const me = req.usuario;
    const { status, provaId, usuarioId } = req.query;

    const gincanaId = escopoGincana(req);
    const filtro = { gincana_id: gincanaId };
    if (status) filtro.status = status;
    if (provaId) filtro.prova_id = provaId;
    if (usuarioId) filtro.usuario_id = usuarioId;

    if (me.tipo === 'COORDENADOR') {
      const equipesCoord = await getEquipesGincanaDoCoordenador(me.id, { gincanaId });
      const ids = equipesCoord.map(e => e._id);
      filtro.$or = [{ equipe_origem_id: { $in: ids } }, { equipe_destino_id: { $in: ids } }];
    }

    const items = await EmprestimoEquipe.find(filtro).sort({ criado_em: -1 }).populate(basePopulate);
    return res.status(200).json(comTurmaDoEmprestado(items, req.escolaId));
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar empréstimos.', error: error.message });
  }
};

// [PATCH] /api/equipes/emprestimos/:id/encerrar
// body: { justificativa? }
export const encerrarEmprestimo = async (req, res) => {
  try {
    const me = req.usuario;
    const { id } = req.params;
    const { justificativa } = req.body || {};

    const emp = await EmprestimoEquipe.findById(id);
    if (!emp) return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    if (emp.status !== 'ATIVO') return res.status(409).json({ message: 'Empréstimo não está ATIVO.' });

    emp.status = 'ENCERRADO';
    emp.fim = new Date();
    emp.encerrado_por = me.id;
    if (justificativa) emp.justificativa_encerramento = justificativa;
    await emp.save();

    const result = await EmprestimoEquipe.findById(id).populate(basePopulate);
    return res.status(200).json(comTurmaDoEmprestado(result, req.escolaId));
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao encerrar empréstimo.', error: error.message });
  }
};

// -------------------------------------------
// Helper que você pode reutilizar no fluxo de “responder prova”, etc.
// Retorna o _id de EquipeGincana “efetiva” para o par (usuario, prova) considerando empréstimo ATIVO.
export async function resolverEquipeParaProva(usuarioId, provaId) {
  // 1) existe empréstimo ATIVO para esta prova?
  const emp = await EmprestimoEquipe.findOne({ usuario_id: usuarioId, prova_id: provaId, status: 'ATIVO' })
    .select('equipe_destino_id fim inicio');

  if (emp) {
    // O empréstimo vale durante o tempo da prova. Após a prova terminar (data_fim),
    // o aluno volta a contar pela sua equipe de origem — ele nunca trocou de equipe de fato.
    const prova = await Prova.findById(provaId).select('data_fim');
    const agora = new Date();
    const provaEncerrada = prova?.data_fim ? agora > new Date(prova.data_fim) : false;
    const emprestimoEncerrado = emp.fim ? agora > new Date(emp.fim) : false;

    if (!provaEncerrada && !emprestimoEncerrado) {
      return emp.equipe_destino_id; // equipe “válida” durante a prova
    }
  }

  // 2) senão, cai na equipe original do usuário
  const membro = await EquipeMembro.findOne({ usuario_id: usuarioId }).select('equipe_id');
  return membro ? membro.equipe_id : null;
}
