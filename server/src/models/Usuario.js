import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Perfis que fazem sentido DENTRO de uma escola. SUPER_ADMIN não entra aqui:
// ele é global (ver comentário do campo `tipo`).
export const PERFIS_ESCOLA = ['ADMIN', 'PROFESSOR', 'ALUNO', 'COORDENADOR', 'PAI/MÃE'];

/**
 * Perfis que podem atuar em MAIS DE UMA escola ao mesmo tempo.
 *
 * A regra do sistema divide os perfis em dois grupos:
 *
 *  - Participante (ALUNO, COORDENADOR, PAI/MÃE) — pertence a EXATAMENTE UMA
 *    escola. São os perfis que competem: turma, equipe, provas e resultados só
 *    fazem sentido dentro de uma escola, e o mesmo aluno em duas escolas
 *    competiria contra si mesmo. Note que são justamente os perfis que exigem
 *    `turma` (e o PAI/MÃE, que acompanha o aluno).
 *
 *  - Equipe organizadora (ADMIN, PROFESSOR) — pode acumular escolas. Na prática
 *    são os professores que organizam a gincana, e a mesma pessoa costuma
 *    organizar a de mais de uma escola. O SUPER_ADMIN é global por definição
 *    (enxerga todas, sem precisar de vínculo).
 *
 * Para mudar o grupo de um perfil basta editar esta lista — a validação do
 * schema e as checagens dos controllers leem daqui.
 */
export const PERFIS_MULTI_ESCOLA = ['ADMIN', 'PROFESSOR'];

/** Indica se o perfil pode acumular vínculos com várias escolas. */
export const podeMultiEscola = (tipo) =>
  tipo === 'SUPER_ADMIN' || PERFIS_MULTI_ESCOLA.includes(tipo);

/**
 * Situação de um vínculo usuário <-> escola.
 *
 *  - ATIVO    — usa o sistema normalmente.
 *  - PENDENTE — solicitação de vínculo aguardando um ADMIN da escola de
 *               destino (ver conviteController.decidirPendencia). Não é acesso,
 *               mas também não é bloqueio: quem está aqui espera uma decisão.
 *  - INATIVO  — acesso DESATIVADO, e reversível. É o estado administrativo do
 *               dia a dia: aluno que saiu no meio do ano, professor afastado,
 *               conta criada por engano. Reativar é só voltar para ATIVO.
 *  - BANIDO   — acesso ENCERRADO por decisão disciplinar, e definitivo por
 *               padrão. A diferença prática para INATIVO está em três pontos:
 *               a mensagem que a pessoa vê (`VINCULO_BANIDO` vs
 *               `VINCULO_INATIVO`, ver auth/authPermissions.js), o fato de o
 *               alternador implícito de status se recusar a desfazê-lo (só um
 *               `status: 'ATIVO'` explícito reativa — ver
 *               usuarioController.alternarStatusUsuario) e a tela terminal que
 *               o front mostra em cada caso.
 *
 * INATIVO e BANIDO são os dois estados BLOQUEADOS: nenhum passa por
 * `resolverEscola`, e nenhum aparece como escola selecionável no front.
 */
export const STATUS_VINCULO = ['ATIVO', 'INATIVO', 'BANIDO', 'PENDENTE'];

/**
 * Estados em que o vínculo existe mas não dá acesso nenhum à escola.
 * PENDENTE fica DE FORA de propósito: ele tem fluxo próprio (tela de espera) e
 * precisa continuar selecionável, senão quem aguarda aprovação nunca chega lá.
 */
export const STATUS_VINCULO_BLOQUEADO = ['INATIVO', 'BANIDO'];

/**
 * Indica se o vínculo está bloqueado.
 *
 * A checagem é por EXCLUSÃO (tudo que não é ATIVO nem PENDENTE) e não pela
 * lista acima, de propósito: um status desconhecido precisa contar como
 * bloqueio, não como acesso. O caso concreto é o `SUSPENSO` legado — ele saiu
 * do enum, mas segue nos documentos de qualquer banco onde ainda não se rodou
 * `npm run migrar:suspenso`, e um valor desses lido como "não bloqueado"
 * reabriria exatamente o laço escola <-> gincana: a escola seria dada como
 * selecionável, `resolverEscola` responderia 403 assim mesmo (lá a regra já é
 * `!== 'ATIVO'`) e o ciclo recomeçaria. Errar para o lado do bloqueio deixa a
 * migração ser uma limpeza, e não um pré-requisito para o sistema funcionar.
 */
export const vinculoBloqueado = (status) => status !== 'ATIVO' && status !== 'PENDENTE';

export const TURMAS = [
  "EF - 1º Ano", "EF - 2º Ano", "EF - 3º Ano", "EF - 4º Ano", "EF - 5º Ano",
  "EF - 6º Ano", "EF - 7º Ano", "EF - 8º Ano", "EF - 9º Ano", "EM - 1º Ano",
  "EM - 2º Ano", "EM - 3º Ano", null
];

/**
 * Vínculo do usuário com UMA escola. É aqui que mora o papel: a mesma pessoa
 * pode ser COORDENADOR na escola A e PROFESSOR na escola B sem que uma edição
 * respingue na outra.
 */
const VinculoEscolaSchema = new mongoose.Schema({
  escola_id: {
    type: String,
    ref: 'Escola',
    required: true,
  },

  tipo: {
    type: String,
    enum: PERFIS_ESCOLA,
    required: true,
  },

  // A turma também é por escola: um aluno transferido pode estar em séries
  // diferentes em cada uma.
  turma: {
    type: String,
    enum: TURMAS,
    default: null,
  },

  // PENDENTE é a solicitação de vínculo (código de convite sem aprovação
  // automática, ou transferência de escola) — não conta como acesso: quem
  // decide se ela vira ATIVO ou some é o ADMIN da escola de destino (ver
  // conviteController.decidirPendencia). Convive com um vínculo ATIVO em
  // outra escola até ser decidida (é assim que a transferência funciona).
  status: {
    type: String,
    enum: STATUS_VINCULO,
    default: 'ATIVO',
  },

  // Rastreia por qual código de convite este vínculo nasceu. Sem isso,
  // revogar um código vazado não permite achar quem já entrou por ele
  // (ver GET /api/convites/:id/usuarios).
  codigo_convite_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodigoConvite',
    default: null,
  },

  criado_em: { type: Date, default: Date.now },
}, { _id: false });

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  senha: { type: String, required: true },
  telefone: { type: String },

  // Papel BASE / global do usuário. NÃO é a fonte da verdade dentro de uma
  // escola — quem manda ali é `vinculos[].tipo`. Este campo serve para:
  //  - marcar o SUPER_ADMIN, que é global e enxerga todas as escolas;
  //  - ser o padrão herdado quando o usuário é vinculado a uma escola nova
  //    (é o que faz um ADMIN continuar ADMIN ao entrar em outra escola).
  tipo: {
    type: String,
    enum: ['SUPER_ADMIN', ...PERFIS_ESCOLA],
    required: true,
  },

  // Vínculos escola <-> papel. Um professor/coordenador pode atuar em várias
  // escolas, com papel independente em cada uma.
  // SUPER_ADMIN pode ter a lista vazia: ele acessa todas.
  vinculos: {
    type: [VinculoEscolaSchema],
    default: [],
  },

  // Turma base (legado / padrão herdado por novos vínculos).
  turma: {
    type: String,
    enum: TURMAS,
    default: null
  },

  // Status BASE / legado. Como o papel, ele NÃO é a fonte da verdade dentro de
  // uma escola — quem manda é `vinculos[].status`, e é só nele que a tela de
  // Gerenciar Usuários escreve. Fica aqui para as instalações anteriores ao
  // multi-escola, cujos usuários não têm nenhum vínculo para consultar.
  status: { type: String, enum: ['ATIVO', 'INATIVO', 'BANIDO'], default: 'ATIVO' },
  criado_em: { type: Date, default: Date.now },
});

// Consultas do tipo "usuários da escola X" e "ADMINs da escola X" batem neste índice.
UsuarioSchema.index({ 'vinculos.escola_id': 1, 'vinculos.tipo': 1 });

// Rede de segurança da regra "perfil de aluno = uma escola só": vale para
// qualquer caminho que salve o documento, inclusive scripts. Os controllers
// checam antes para devolver uma mensagem melhor (409/400); aqui a violação
// vira um ValidationError, e não um documento inconsistente no banco.
UsuarioSchema.pre('validate', function (next) {
  // Vínculo PENDENTE é uma solicitação, não um acesso: não conta para a regra
  // de escola única. É isso que permite o vínculo PENDENTE de destino conviver
  // com o vínculo ATIVO de origem durante uma transferência (ver plano,
  // "Insight central do desenho").
  const vinculos = (this.vinculos || []).filter((v) => v.status !== 'PENDENTE');

  if (vinculos.length > 1) {
    const preso = vinculos.find((v) => !podeMultiEscola(v.tipo));
    if (preso) {
      this.invalidate(
        'vinculos',
        `O perfil ${preso.tipo} pertence a uma única escola. Apenas ${PERFIS_MULTI_ESCOLA.join(', ')} podem atuar em mais de uma.`
      );
    }
  }

  next();
});

UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

const Usuario = mongoose.model('Usuario', UsuarioSchema, 'Usuarios');

export default Usuario;
