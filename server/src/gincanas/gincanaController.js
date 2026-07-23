import Gincana from '../models/Gincana.js';
import { getGincanaIdsDoUsuario } from './gincanaHelpers.js';

/**
 * [GET] Lista todas as gincanas (apenas ADMIN).
 */
export const listarGincanas = async (req, res) => {
    try {
        const gincanas = await Gincana.find().sort({ ano: -1, criado_em: -1 });
        res.status(200).json(gincanas);
    } catch (error) {
        console.error('Erro ao listar gincanas:', error);
        res.status(500).json({ message: 'Erro interno ao listar gincanas.' });
    }
};

/**
 * [GET] Lista as gincanas visíveis para o usuário logado.
 * - ADMIN: todas as não-arquivadas.
 * - Demais perfis: apenas aquelas em que participa (via EquipeMembros).
 */
export const minhasGincanas = async (req, res) => {
    try {
        if (req.usuario.tipo === 'ADMIN') {
            const gincanas = await Gincana
                .find({ status: { $ne: 'ARQUIVADA' } })
                .sort({ ano: -1, criado_em: -1 });
            return res.status(200).json(gincanas);
        }

        const gincanaIds = await getGincanaIdsDoUsuario(req.usuario.id);
        const gincanas = await Gincana
            .find({ _id: { $in: gincanaIds }, status: { $ne: 'ARQUIVADA' } })
            .sort({ ano: -1, criado_em: -1 });

        res.status(200).json(gincanas);
    } catch (error) {
        console.error('Erro ao listar minhas gincanas:', error);
        res.status(500).json({ message: 'Erro interno ao listar gincanas do usuário.' });
    }
};

/**
 * [POST] Cria uma nova gincana (apenas ADMIN).
 */
export const criarGincana = async (req, res) => {
    try {
        const { nome, ano, descricao, data_inicio, data_fim, status } = req.body;

        if (!nome || ano === undefined || ano === null || ano === '') {
            return res.status(400).json({ message: 'Nome e ano são obrigatórios.' });
        }

        const jaExiste = await Gincana.findOne({ nome: nome.trim(), ano });
        if (jaExiste) {
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano.' });
        }

        const gincana = new Gincana({
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
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano.' });
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

        const gincana = await Gincana.findById(id);
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
            return res.status(409).json({ message: 'Já existe uma gincana com esse nome e ano.' });
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

        const gincana = await Gincana.findByIdAndUpdate(
            id,
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
