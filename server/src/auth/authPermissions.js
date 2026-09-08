import jwt from 'jsonwebtoken';
import Gincana from '../models/Gincana.js';
import Escola from '../models/Escola.js';
import Usuario from '../models/Usuario.js';
import { usuarioParticipaDaGincana, gincanaEncerrada } from '../gincanas/gincanaHelpers.js';
import { papelNaEscola, getVinculo } from '../escolas/escolaHelpers.js';

// Gincana legada (dados anteriores ao multi-gincana). Usada como fallback quando
// o cliente não envia o header X-Gincana-Id — e só se ela for da escola ativa.
const GINCANA_FALLBACK_ID = 'GINCANA_PRINCIPAL';

// Escola legada (dados anteriores ao multi-escola). Fallback do header X-Escola-Id.
const ESCOLA_FALLBACK_ID = 'ESCOLA_PRINCIPAL';


/* Middleware que verifica se o usuário possui permissão e um token
  de autenticação válido*/
export const proteger = (req, res, next) => {
  // Alguns routers aplicam `proteger` no router.use() e novamente na rota.
  // Depois de resolverEscola, `req.usuario.tipo` contém o papel LOCAL daquela
  // escola. Revalidar o mesmo JWT aqui sobrescrevia esse papel com o tipo base
  // do token (ex.: Doffy voltava de ADMIN para ALUNO) antes de autorizar().
  //
  // Só confia na flag interna definida por este próprio middleware; uma
  // propriedade enviada pelo cliente não vira campo de `req` no Express.
  if (req.tokenAutenticacaoValidado && req.usuario) {
    return next();
  }

  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded; // Anexa os dados do usuário na requisição
      req.tokenAutenticacaoValidado = true;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado, nenhum token fornecido.' });
  }
};

// Verifica se o usuário tem o perfil necessário.
//
// Atenção: `req.usuario.tipo` aqui já é o papel NA ESCOLA ATIVA quando
// `resolverEscola` rodou antes (ele sobrescreve o valor que veio do token).
// É isso que permite a mesma pessoa ser ADMIN numa escola e ALUNO em outra.
export const autorizar = (...tipos) => {
  return (req, res, next) => {
    // SUPER_ADMIN é o perfil global do multi-escola: tem acesso a tudo que o
    // ADMIN tem, sem precisar ser listado em cada chamada de autorizar().
    if (req.usuario.tipo === 'SUPER_ADMIN') {
      return next();
    }
    if (!tipos.includes(req.usuario.tipo)) {
      return res.status(403).json({ message: `Acesso negado. Apenas os perfis [${tipos.join(', ')}] são permitidos.` });
    }
    next();
  };
};

/**
 * Middleware que revalida o papel BASE do usuário contra o banco.
 *
 * O JWT carrega `tipo` congelado no momento do login e vale 2h. Quem for
 * rebaixado (SUPER_ADMIN -> ADMIN, ADMIN -> ALUNO) continuaria com os poderes
 * antigos até o token expirar, porque `autorizar()` lê `req.usuario.tipo`.
 * Por isso todo caminho que decide permissão relê o `tipo` do banco antes.
 *
 * Encadeie DEPOIS de `proteger` e ANTES de `autorizar(...)` em rotas que NÃO
 * usam `resolverEscola` (que já faz essa releitura por conta própria) — hoje,
 * as rotas globais de administração de escolas.
 *
 * Injeta `req.usuarioDoc` para que `resolverEscola`, se vier depois, não
 * precise consultar o banco de novo.
 */
export const resolverPapelBase = async (req, res, next) => {
  try {
    if (req.usuarioDoc) return next();

    const usuario = await Usuario.findById(req.usuario.id).select('tipo turma status vinculos');
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário do token não existe mais.' });
    }

    req.usuario = { ...req.usuario, tipo: usuario.tipo };
    req.usuarioDoc = usuario;
    next();
  } catch (error) {
    console.error('Erro ao revalidar o papel do usuário:', error);
    res.status(500).json({ message: 'Erro interno ao validar as permissões.' });
  }
};

/**
 * Middleware de escopo de ESCOLA (tenant raiz). Encadeie DEPOIS de `proteger` e
 * ANTES de `resolverGincana`.
 *
 * Resolve a escola ativa a partir do header `X-Escola-Id`:
 *  - relê o usuário no banco (o papel nunca vem do JWT, ver `resolverPapelBase`);
 *  - valida que a escola existe;
 *  - resolve o PAPEL do usuário naquela escola (Usuario.vinculos) e o injeta em
 *    `req.usuario.tipo`, substituindo o papel que veio no token;
 *  - 403 para quem não tem vínculo com ela (exceto SUPER_ADMIN);
 *  - injeta `req.escolaId`, `req.escola` e `req.vinculoEscola`.
 *
 * O papel vem do banco (e não do JWT) de propósito: o token é emitido uma vez
 * no login e não sabe em qual escola o usuário vai entrar depois.
 *
 * Sem o header (ex.: cache antigo do front), usa a escola legada
 * 'ESCOLA_PRINCIPAL' como fallback — mas o vínculo continua sendo exigido.
 */
export const resolverEscola = async (req, res, next) => {
  try {
    const headerEscolaId = req.headers['x-escola-id'];

    if (!headerEscolaId) {
      console.warn(
        `[resolverEscola] Requisição sem X-Escola-Id em ${req.method} ${req.originalUrl}; ` +
        `tentando fallback '${ESCOLA_FALLBACK_ID}'.`
      );
    }

    const escolaId = headerEscolaId || ESCOLA_FALLBACK_ID;

    const escola = await Escola.findById(escolaId);

    // Escola inexistente pedida explicitamente: recusa sem nem olhar o usuário.
    if (!escola && headerEscolaId) {
      return res.status(404).json({ message: 'Escola não encontrada.' });
    }

    // O usuário é carregado ANTES de qualquer decisão de permissão: o `tipo` do
    // token pode estar defasado (ver resolverPapelBase).
    const usuario = req.usuarioDoc
      || await Usuario.findById(req.usuario.id).select('tipo turma status vinculos');
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário do token não existe mais.' });
    }
    req.usuarioDoc = usuario;

    if (!escola) {
      // Sem header E sem a escola legada no banco. Isso só pode ser uma
      // instalação anterior ao multi-escola (que ainda não rodou o seed), e aí
      // o escopo legado segue valendo para não derrubar a aplicação inteira.
      //
      // Fora desse caso o ramo é um bypass de autorização: ele não checa
      // vínculo e deixa `req.usuario.tipo` com o papel base. Quem é ALUNO na
      // escola A mas tem `tipo` base ADMIN passaria em autorizar('ADMIN') só
      // omitindo o header. Por isso a porta é fechada assim que existir
      // qualquer escola cadastrada ou o usuário tiver qualquer vínculo.
      const temVinculos = (usuario.vinculos || []).length > 0;
      const instalacaoMigrada = temVinculos || Boolean(await Escola.exists({}));

      if (instalacaoMigrada) {
        return res.status(400).json({
          message: 'Selecione a escola que deseja acessar.',
          codigo: 'ESCOLA_NAO_SELECIONADA',
        });
      }

      req.usuario = { ...req.usuario, tipo: usuario.tipo };
      req.escolaId = ESCOLA_FALLBACK_ID;
      req.escola = null;
      req.vinculoEscola = null;
      return next();
    }

    // SUPER_ADMIN opera em qualquer escola; demais perfis só nas que estão vinculados.
    if (usuario.tipo === 'SUPER_ADMIN') {
      req.usuario = { ...req.usuario, tipo: 'SUPER_ADMIN' };
      req.escolaId = String(escola._id);
      req.escola = escola;
      req.vinculoEscola = null;
      return next();
    }

    const papel = papelNaEscola(usuario, escola._id);
    if (!papel) {
      return res.status(403).json({
        message: 'Você não tem acesso a esta escola.',
        codigo: 'SEM_VINCULO_ESCOLA',
      });
    }

    const vinculo = getVinculo(usuario, escola._id);
    if (vinculo && vinculo.status !== 'ATIVO') {
      // PENDENTE é uma solicitação em análise (código sem aprovação automática,
      // ou transferência aguardando o ADMIN de destino) — código próprio para
      // o front não tratar como "perdi acesso" (VINCULO_INATIVO) e mandar para
      // /selecionar-escola em loop; ele deve ir para uma tela de espera.
      if (vinculo.status === 'PENDENTE') {
        return res.status(403).json({
          message: 'Seu vínculo com esta escola ainda está aguardando aprovação.',
          codigo: 'VINCULO_PENDENTE',
        });
      }
      return res.status(403).json({
        message: 'Seu acesso a esta escola está inativo.',
        codigo: 'VINCULO_INATIVO',
      });
    }

    // Papel efetivo do tenant: daqui pra frente `autorizar()` e os controllers
    // veem o papel DESTA escola, não o papel base do token.
    req.usuario = { ...req.usuario, tipo: papel, turma: vinculo?.turma ?? null };
    req.usuarioDoc = usuario;
    req.escolaId = String(escola._id);
    req.escola = escola;
    req.vinculoEscola = vinculo;
    next();
  } catch (error) {
    console.error('Erro ao resolver escola:', error);
    res.status(500).json({ message: 'Erro interno ao resolver o escopo da escola.' });
  }
};

/**
 * Fábrica do middleware de escopo de gincana. Deve ser encadeado DEPOIS de
 * `resolverEscola`.
 *
 * Resolve a gincana "ativa" da requisição a partir do header `X-Gincana-Id`:
 *  - valida que a gincana existe;
 *  - valida que ela pertence à escola ativa (`req.escolaId`) — é isso que impede
 *    uma escola de alcançar dados de outra;
 *  - recusa gincanas ENCERRADA/ARQUIVADA: edições passadas são só histórico;
 *  - com `exigirParticipacao` (padrão), perfis não-ADMIN precisam já participar
 *    da gincana (403 caso contrário);
 *  - injeta `req.gincanaId` (String) para uso nos controllers.
 *
 * Sem o header, só cai na gincana legada 'GINCANA_PRINCIPAL' se ela for da escola
 * ativa. Caso contrário responde 400 com `codigo: 'GINCANA_NAO_SELECIONADA'` —
 * o front usa esse código para mandar o usuário à tela de escolher a gincana.
 * (O fallback cego era o que quebrava tudo depois de trocar de escola: o header
 * antigo apontava para uma gincana de outro tenant.)
 *
 * `exigirParticipacao: false` gera `resolverGincanaParaInscricao`, usado SÓ nas
 * rotas de entrar numa equipe (`GET /equipes/para-inscricao` e
 * `POST /equipes/:id/register`): sem isso, um aluno recém-vinculado à escola
 * nunca conseguia ver ou se inscrever em nenhuma equipe — a checagem de
 * participação (que vem justamente de estar numa equipe) bloqueava a própria
 * rota que o deixaria entrar numa. As demais checagens (tenant, encerrada)
 * continuam valendo por igual.
 */
const construirResolverGincana = ({ exigirParticipacao }) => async (req, res, next) => {
  try {
    const headerGincanaId = req.headers['x-gincana-id'];

    if (!headerGincanaId) {
      console.warn(
        `[resolverGincana] Requisição sem X-Gincana-Id em ${req.method} ${req.originalUrl}; ` +
        `tentando fallback '${GINCANA_FALLBACK_ID}'.`
      );
    }

    const gincana = await Gincana.findById(headerGincanaId || GINCANA_FALLBACK_ID);

    const pedirSelecao = () => res.status(400).json({
      message: 'Selecione a gincana que deseja acessar.',
      codigo: 'GINCANA_NAO_SELECIONADA',
    });

    if (!gincana) {
      // Sem header E sem a gincana legada no banco: instalação anterior ao
      // multi-gincana, que ainda não rodou o seed. Segue com o escopo legado.
      if (!headerGincanaId) {
        req.gincanaId = GINCANA_FALLBACK_ID;
        return next();
      }
      return res.status(404).json({ message: 'Gincana não encontrada.' });
    }

    // Barreira entre tenants: a gincana precisa ser da escola ativa.
    if (req.escolaId && String(gincana.escola_id) !== String(req.escolaId)) {
      // Sem header é o caso "troquei de escola e o fallback legado não vale
      // aqui": peça uma seleção em vez de devolver um 404 confuso.
      if (!headerGincanaId) return pedirSelecao();
      // Com header, responde 404 (e não 403) para não revelar a existência de
      // gincanas de outras escolas.
      return res.status(404).json({ message: 'Gincana não encontrada.' });
    }

    // Edição encerrada (status ENCERRADA/ARQUIVADA ou ano já passado) é
    // histórico: aparece na lista marcada como tal, mas não se entra nela.
    if (gincanaEncerrada(gincana)) {
      return res.status(400).json({
        message: `A gincana "${gincana.nome}" (${gincana.ano}) está encerrada e não pode ser acessada.`,
        codigo: 'GINCANA_ENCERRADA',
      });
    }

    // ADMIN opera em qualquer gincana; demais perfis só nas que participam
    // (exceto nas rotas de inscrição, que precisam ser alcançáveis por quem
    // ainda não participa de nenhuma).
    if (exigirParticipacao && req.usuario.tipo !== 'ADMIN' && req.usuario.tipo !== 'SUPER_ADMIN') {
      const participa = await usuarioParticipaDaGincana(req.usuario.id, gincana._id);
      if (!participa) {
        // Participação é derivada de EquipeMembros (ver getGincanaIdsDoUsuario),
        // então quem acabou de ser aprovado na escola cai aqui em TODA tela até
        // entrar numa equipe. Não é perda de acesso nem escopo inválido: é um
        // passo de onboarding que falta. O `codigo` existe para o front mandar
        // essa pessoa para a inscrição em equipe em vez de mostrar um erro
        // genérico em cada página (ver services/api.js).
        return res.status(403).json({
          message: 'Você ainda não faz parte de nenhuma equipe desta gincana. '
            + 'Inscreva-se em uma equipe para acessar esta área.',
          codigo: 'SEM_EQUIPE_NA_GINCANA',
        });
      }
    }

    req.gincanaId = String(gincana._id);
    req.gincana = gincana;
    next();
  } catch (error) {
    console.error('Erro ao resolver gincana:', error);
    res.status(500).json({ message: 'Erro interno ao resolver o escopo da gincana.' });
  }
};

export const resolverGincana = construirResolverGincana({ exigirParticipacao: true });
export const resolverGincanaParaInscricao = construirResolverGincana({ exigirParticipacao: false });
