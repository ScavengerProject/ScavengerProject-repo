import Gincana from '../models/Gincana.js';
import { getGincanaIdsDoUsuario, gincanaEncerrada } from './gincanaHelpers.js';

/**
 * [GET] Lista as gincanas da escola ativa (ADMIN da escola ou SUPER_ADMIN).
 */
export const listarGincanas = async (req, res) => {
    try {
        const gincanas = await Gincana
            .find({ escola_id: req.escolaId })
            .sort({ ano: -1, criado_em: -1 });
        res.status(200).json(gincanas);
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

        const comFlag = (lista) => lista.map((g) => ({
            ...g.toObject(),
            encerrada: gincanaEncerrada(g),
        }));

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
