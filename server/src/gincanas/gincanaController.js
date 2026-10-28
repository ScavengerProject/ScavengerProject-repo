import Gincana from '../models/Gincana.js';
import ConfiguracaoGincana from '../models/ConfiguracaoGincana.js';
import { getGincanaIdsDoUsuario, gincanaEncerrada, resultadoFinalDisponivel } from './gincanaHelpers.js';
import { calcularRanking } from './rankingGincana.js';
import { coordenadoresPorEquipe, notificarResultadoFinal } from './notificarResultadoFinal.js';

/**
 * [GET] Lista as gincanas da escola ativa (ADMIN da escola ou SUPER_ADMIN).
 */
export const listarGincanas = async (req, res) => {
    try {
        const gincanas = await Gincana
            .find({ escola_id: req.escolaId })
            .sort({ ano: -1, criado_em: -1 });
        // A classificação congelada fica de fora da listagem (a cerimônia tem
        // rota própria); a tela só precisa saber se ela existe.
        res.status(200).json(gincanas.map((g) => {
            const { resultado_final, ...dados } = g.toObject();
            return { ...dados, tem_resultado_final: resultadoFinalDisponivel(g) };
        }));
    } catch (error) {
        console.error('Erro ao listar gincanas:', error);
        res.status(500).json({ message: 'Erro interno ao listar gincanas.' });
    }
};

/**
 * [GET] Lista as gincanas visíveis para o usuário logado NA ESCOLA ATIVA.
 * - ADMIN/SUPER_ADMIN: todas as não-arquivadas da escola.
 * - Demais perfis: apenas aquelas em que participa (via EquipeMembros).
 *
 * O filtro por `escola_id` vale para todos os perfis: é ele que faz o seletor
 * de gincana da navbar mostrar só as edições da escola selecionada.
 *
 * Cada item traz `encerrada`: edições de anos passados (ou marcadas como
 * ENCERRADA) aparecem na lista como histórico, mas não podem ser acessadas —
 * a mesma regra que o middleware resolverGincana aplica na API.
 */
export const minhasGincanas = async (req, res) => {
    try {
        const filtroEscola = { escola_id: req.escolaId, status: { $ne: 'ARQUIVADA' } };

        // `resultado_final` fica de fora: traz os pontos de todas as equipes, e
        // esta rota responde a qualquer participante — quem decide se os pontos
        // aparecem é GET /:id/resultado-final (mostrar_notas_ranking).
        const comFlag = (lista) => lista.map((g) => {
            const { resultado_final, ...dados } = g.toObject();
            return {
                ...dados,
                encerrada: gincanaEncerrada(g),
                tem_resultado_final: resultadoFinalDisponivel(g),
            };
        });

        if (req.usuario.tipo === 'ADMIN' || req.usuario.tipo === 'SUPER_ADMIN') {
            const gincanas = await Gincana
                .find(filtroEscola)
                .sort({ ano: -1, criado_em: -1 });
            return res.status(200).json(comFlag(gincanas));
        }

        const gincanaIds = await getGincanaIdsDoUsuario(req.usuario.id);
        const gincanas = await Gincana
            .find({ ...filtroEscola, _id: { $in: gincanaIds } })
            .sort({ ano: -1, criado_em: -1 });

        res.status(200).json(comFlag(gincanas));
    } catch (error) {
        console.error('Erro ao listar minhas gincanas:', error);
        res.status(500).json({ message: 'Erro interno ao listar gincanas do usuário.' });
    }
};

/**
 * [GET] Lista as gincanas ATIVAS da escola ativa, sem exigir participação —
 * ao contrário de `minhasGincanas`, que para não-admin só devolve gincanas
 * onde o usuário já tem equipe. Alimenta a tela de seleção quando um aluno
 * ainda não está em nenhuma equipe: ele precisa VER a gincana pra poder
 * escolher uma equipe e se inscrever, antes de "participar" dela.
 */
export const listarGincanasDisponiveis = async (req, res) => {
    try {
        const gincanas = await Gincana
            .find({ escola_id: req.escolaId, status: 'ATIVA' })
            .select('nome ano descricao data_inicio data_fim status')
            .sort({ ano: -1, criado_em: -1 });
        res.status(200).json(gincanas);
    } catch (error) {
        console.error('Erro ao listar gincanas disponíveis:', error);
        res.status(500).json({ message: 'Erro interno ao listar gincanas disponíveis.' });
    }
};

/**
 * [POST] Cria uma nova gincana na escola ativa (ADMIN da escola ou SUPER_ADMIN).
 */
export const criarGincana = async (req, res) => {
    try {
        const { nome, ano, descricao, data_inicio, data_fim, status, escola_id } = req.body;

        // A escola da gincana vem exclusivamente do escopo validado pelo
        // resolverEscola. Mesmo que alguém altere a requisição manualmente, um
        // ADMIN não consegue criar em outro tenant indicando escola_id no body.
        if (escola_id && String(escola_id) !== String(req.escolaId)) {
            return res.status(403).json({
                message: 'A gincana só pode ser criada na escola ativa.',
                codigo: 'ESCOLA_DIFERENTE_DO_ESCOPO',
            });
        }

        if (!nome || ano === undefined || ano === null || ano === '') {
            return res.status(400).json({ message: 'Nome e ano são obrigatórios.' });
        }

        const jaExiste = await Gincana.findOne({ escola_id: req.escolaId, nome: nome.trim(), ano });
        if (jaExiste) {
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano nesta escola.' });
        }

        const gincana = new Gincana({
            escola_id: req.escolaId,
            nome: nome.trim(),
            ano,
            descricao: descricao || '',
            data_inicio: data_inicio || null,
            data_fim: data_fim || null,
            status: status || 'ATIVA',
            criado_por: req.usuario.id,
        });

        await gincana.save();
        res.status(201).json(gincana);
    } catch (error) {
        console.error('Erro ao criar gincana:', error);
        if (error.code === 11000) {
            // O índice correto contém escola_id. Se o erro veio do índice
            // legado {nome, ano}, sinaliza claramente que o servidor ainda não
            // reiniciou após a migração automática de índices.
            if (!error.keyPattern?.escola_id) {
                return res.status(503).json({
                    message: 'Os índices de multi-escola ainda estão sendo atualizados. Reinicie a API e tente novamente.',
                    codigo: 'INDICE_MULTI_ESCOLA_DESATUALIZADO',
                });
            }
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano nesta escola.' });
        }
        res.status(500).json({ message: 'Erro interno ao criar gincana.' });
    }
};

/**
 * [PUT] Atualiza os dados de uma gincana (apenas ADMIN).
 */
export const atualizarGincana = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, ano, descricao, data_inicio, data_fim, status } = req.body;

        // Busca escopada: um ADMIN não alcança gincanas de outra escola.
        const gincana = await Gincana.findOne({ _id: id, escola_id: req.escolaId });
        if (!gincana) {
            return res.status(404).json({ message: 'Gincana não encontrada.' });
        }

        if (nome !== undefined) gincana.nome = nome.trim();
        if (ano !== undefined) gincana.ano = ano;
        if (descricao !== undefined) gincana.descricao = descricao;
        if (data_inicio !== undefined) gincana.data_inicio = data_inicio;
        if (data_fim !== undefined) gincana.data_fim = data_fim;
        if (status !== undefined) gincana.status = status;

        await gincana.save();
        res.status(200).json(gincana);
    } catch (error) {
        console.error('Erro ao atualizar gincana:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano nesta escola.' });
        }
        res.status(500).json({ message: 'Erro interno ao atualizar gincana.' });
    }
};

/**
 * [PATCH] Altera o status da gincana (ENCERRADA/ARQUIVADA/ATIVA).
 * Não há delete físico por causa dos dados dependentes (equipes, resultados, etc.).
 */
export const alterarStatusGincana = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ATIVA', 'ENCERRADA', 'ARQUIVADA'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido.' });
        }

        const gincana = await Gincana.findOneAndUpdate(
            { _id: id, escola_id: req.escolaId },
            { status },
            { new: true }
        );

        if (!gincana) {
            return res.status(404).json({ message: 'Gincana não encontrada.' });
        }

        res.status(200).json(gincana);
    } catch (error) {
        console.error('Erro ao alterar status da gincana:', error);
        res.status(500).json({ message: 'Erro interno ao alterar status da gincana.' });
    }
};

/**
 * [POST] Encerra a gincana congelando a classificação final (apenas ADMIN).
 *
 * Diferente do PATCH /status, que só troca o campo, aqui o ranking do momento
 * é gravado em `resultado_final` — é dele que a cerimônia e os emails leem.
 *
 * Ao encerrar, cada coordenador de cada equipe recebe um email com a posição
 * da equipe (notificarResultadoFinal).
 *
 * Idempotente: se a gincana já está ENCERRADA com resultado, devolve o que foi
 * congelado (200, `ja_encerrada: true`) sem recalcular — um duplo clique não
 * pode trocar o resultado anunciado. Uma gincana reaberta (status ATIVA) é
 * recalculada ao ser encerrada de novo.
 */
export const encerrarGincana = async (req, res) => {
    try {
        const { id } = req.params;

        const gincana = await Gincana.findOne({ _id: id, escola_id: req.escolaId });
        if (!gincana) {
            return res.status(404).json({ message: 'Gincana não encontrada.' });
        }

        if (gincana.status === 'ARQUIVADA') {
            return res.status(409).json({
                message: 'Uma gincana arquivada não pode ser encerrada.',
                codigo: 'GINCANA_ARQUIVADA',
            });
        }

        if (gincana.status === 'ENCERRADA' && gincana.resultado_final) {
            return res.status(200).json({ gincana, ja_encerrada: true });
        }

        const classificacao = await calcularRanking(gincana._id);
        if (classificacao.length === 0) {
            return res.status(409).json({
                message: 'A gincana não tem equipes para classificar.',
                codigo: 'GINCANA_SEM_EQUIPES',
            });
        }

        // Update condicional: entre a leitura acima e aqui, outra requisição
        // (duplo clique) pode ter encerrado a gincana. Só grava quem chegar
        // primeiro; o segundo cai no `!encerrada` e devolve o resultado dele.
        const encerrada = await Gincana.findOneAndUpdate(
            {
                _id: gincana._id,
                escola_id: req.escolaId,
                $or: [
                    { status: 'ATIVA' },
                    { status: 'ENCERRADA', resultado_final: null },
                ],
            },
            {
                status: 'ENCERRADA',
                resultado_final: {
                    encerrada_em: new Date(),
                    encerrada_por: req.usuario.id,
                    classificacao,
                },
            },
            { new: true, runValidators: true }
        );

        if (!encerrada) {
            const atual = await Gincana.findOne({ _id: gincana._id, escola_id: req.escolaId });
            if (atual?.status === 'ENCERRADA' && atual.resultado_final) {
                return res.status(200).json({ gincana: atual, ja_encerrada: true });
            }
            return res.status(409).json({
                message: 'O status da gincana mudou durante o encerramento. Tente novamente.',
                codigo: 'ENCERRAMENTO_CONCORRENTE',
            });
        }

        // Só quem efetivamente encerrou dispara os emails: as respostas
        // idempotentes acima (ja_encerrada) não reenviam nada. Uma falha aqui
        // não desfaz o encerramento — o resultado já está congelado.
        let coordenadoresNotificados = 0;
        try {
            coordenadoresNotificados = await notificarResultadoFinal(encerrada);
        } catch (error) {
            console.error('Erro ao notificar o resultado final aos coordenadores:', error);
        }

        res.status(200).json({
            gincana: encerrada,
            ja_encerrada: false,
            coordenadores_notificados: coordenadoresNotificados,
        });
    } catch (error) {
        console.error('Erro ao encerrar gincana:', error);
        res.status(500).json({ message: 'Erro interno ao encerrar gincana.' });
    }
};

/**
 * [GET] Resultado congelado no encerramento, para a cerimônia de premiação.
 *
 * Sem resolverGincana de propósito: a gincana já está ENCERRADA, e é
 * justamente o que o resolverGincana recusa. O isolamento vem do filtro por
 * `escola_id` (resolverEscola já validou o vínculo com a escola ativa).
 *
 * Antes do encerramento (ou com a gincana reaberta) responde 404
 * RESULTADO_NAO_DISPONIVEL: o ranking ao vivo já tem rota própria, e esta não
 * pode adiantar o anúncio.
 *
 * Os pontos seguem só a configuração mostrar_notas_ranking — SEM a exceção
 * do ADMIN que o ranking tem: quem abre a cerimônia no telão é justamente o
 * ADMIN, e a exceção mostraria à plateia os pontos que a escola escolheu
 * esconder.
 */
export const obterResultadoFinal = async (req, res) => {
    try {
        const gincana = await Gincana.findOne({ _id: req.params.id, escola_id: req.escolaId })
            .select('nome ano status resultado_final');
        if (!gincana) {
            return res.status(404).json({ message: 'Gincana não encontrada.' });
        }
        if (!resultadoFinalDisponivel(gincana)) {
            return res.status(404).json({
                message: 'O resultado final desta gincana ainda não foi divulgado.',
                codigo: 'RESULTADO_NAO_DISPONIVEL',
            });
        }

        const config = await ConfiguracaoGincana.findOne({ gincana_id: gincana._id });
        const mostrarPontos = Boolean(config?.mostrar_notas_ranking);

        const classificacao = gincana.resultado_final.classificacao.map((item) => {
            const { posicao, equipe_id, nome, cor, pontos } = item.toObject();
            return mostrarPontos
                ? { posicao, equipe_id, nome, cor, pontos }
                : { posicao, equipe_id, nome, cor };
        });

        res.status(200).json({
            gincana: { _id: gincana._id, nome: gincana.nome, ano: gincana.ano },
            encerrada_em: gincana.resultado_final.encerrada_em,
            mostrar_pontos: mostrarPontos,
            classificacao,
        });
    } catch (error) {
        console.error('Erro ao obter resultado final da gincana:', error);
        res.status(500).json({ message: 'Erro interno ao obter o resultado final.' });
    }
};

/**
 * [GET] Prévia do encerramento (apenas ADMIN): a classificação que SERIA
 * congelada agora e quantos coordenadores de cada equipe receberiam o email.
 * Não grava nada — é o que a tela mostra antes de o ADMIN confirmar.
 */
export const previaEncerramento = async (req, res) => {
    try {
        const gincana = await Gincana.findOne({ _id: req.params.id, escola_id: req.escolaId })
            .select('nome ano status');
        if (!gincana) {
            return res.status(404).json({ message: 'Gincana não encontrada.' });
        }

        const classificacao = await calcularRanking(gincana._id);
        const coordenadoresDe = await coordenadoresPorEquipe(gincana._id, classificacao);
        const comCoordenadores = classificacao.map((item) => ({
            ...item,
            total_coordenadores: (coordenadoresDe.get(String(item.equipe_id)) || []).length,
        }));

        res.status(200).json({
            gincana,
            classificacao: comCoordenadores,
            total_emails: comCoordenadores.reduce((soma, item) => soma + item.total_coordenadores, 0),
            equipes_sem_coordenador: comCoordenadores
                .filter((item) => item.total_coordenadores === 0)
                .map((item) => item.nome),
        });
    } catch (error) {
        console.error('Erro ao montar a prévia do encerramento:', error);
        res.status(500).json({ message: 'Erro interno ao montar a prévia do encerramento.' });
    }
};
