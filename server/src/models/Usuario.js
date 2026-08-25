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

  status: {
    type: String,
    enum: ['ATIVO', 'INATIVO', 'BANIDO', 'SUSPENSO'],
    default: 'ATIVO',
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

  status: { type: String, enum: ['ATIVO', 'INATIVO', 'BANIDO', 'SUSPENSO'], default: 'ATIVO' },
  criado_em: { type: Date, default: Date.now },
});

// Consultas do tipo "usuários da escola X" e "ADMINs da escola X" batem neste índice.
UsuarioSchema.index({ 'vinculos.escola_id': 1, 'vinculos.tipo': 1 });

// Rede de segurança da regra "perfil de aluno = uma escola só": vale para
// qualquer caminho que salve o documento, inclusive scripts. Os controllers
// checam antes para devolver uma mensagem melhor (409/400); aqui a violação
// vira um ValidationError, e não um documento inconsistente no banco.
UsuarioSchema.pre('validate', function (next) {
  const vinculos = this.vinculos || [];

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
