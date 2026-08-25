import Escola from '../models/Escola.js';
import Usuario from '../models/Usuario.js';
import Gincana from '../models/Gincana.js';
import { PERFIS_ESCOLA } from '../models/Usuario.js';
import {
    filtroEscola,
    getVinculo,
    comVinculoDaEscola,
    aplicarVinculo,
    conflitoMultiEscola,
} from './escolaHelpers.js';

/**
 * [GET] Lista todas as escolas (apenas SUPER_ADMIN).
 */
export const listarEscolas = async (req, res) => {
    try {
        const escolas = await Escola.find().sort({ nome: 1 });
        res.status(200).json(escolas);
    } catch (error) {
        console.error('Erro ao listar escolas:', error);
        res.status(500).json({ message: 'Erro interno ao listar escolas.' });
    }
};

/**
 * [GET] Lista as escolas visíveis para o usuário logado.
 * - SUPER_ADMIN: todas as ativas.
 * - Demais perfis: apenas aquelas às quais está vinculado.
 *
 * Cada item vem com `meu_tipo`: o papel do usuário NAQUELA escola. É o que a
 * tela de seleção usa para saber com que perfil ele vai entrar — e o que o
 * front aplica no lugar do papel do token depois de escolher a escola.
 */
export const minhasEscolas = async (req, res) => {
    try {
        if (req.usuario.tipo === 'SUPER_ADMIN') {
            const escolas = await Escola.find({ status: 'ATIVA' }).sort({ nome: 1 });
            return res.status(200).json(
                escolas.map((e) => ({ ...e.toObject(), meu_tipo: 'SUPER_ADMIN' }))
            );
        }

        const usuario = await Usuario.findById(req.usuario.id).select('tipo vinculos');
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const escolaIds = (usuario.vinculos || []).map((v) => String(v.escola_id));
        const escolas = await Escola
            .find({ _id: { $in: escolaIds }, status: 'ATIVA' })
            .sort({ nome: 1 });

        res.status(200).json(
            escolas.map((e) => {
                const vinculo = getVinculo(usuario, e._id);
                return {
                    ...e.toObject(),
                    meu_tipo: vinculo?.tipo || null,
                    meu_vinculo_status: vinculo?.status || 'ATIVO',
                };
            })
        );
    } catch (error) {
        console.error('Erro ao listar minhas escolas:', error);
        res.status(500).json({ message: 'Erro interno ao listar escolas do usuário.' });
    }
};

/**
 * [GET] Lista pública (sem autenticação) das escolas ativas.
 * Usada no auto-cadastro, onde o candidato precisa escolher a escola antes de
 * ter login. Retorna apenas _id e nome — nada sensível.
 */
export const listarEscolasPublicas = async (req, res) => {
    try {
        const escolas = await Escola
            .find({ status: 'ATIVA' })
            .select('_id nome cidade uf')
            .sort({ nome: 1 });
        res.status(200).json(escolas);
    } catch (error) {
        console.error('Erro ao listar escolas públicas:', error);
        res.status(500).json({ message: 'Erro interno ao listar escolas.' });
    }
};

/**
 * [POST] Cria uma nova escola (apenas SUPER_ADMIN).
 */
export const criarEscola = async (req, res) => {
    try {
        const { nome, cidade, uf, status } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ message: 'O nome da escola é obrigatório.' });
        }

        const jaExiste = await Escola.findOne({ nome: nome.trim() });
        if (jaExiste) {
            return res.status(409).json({ message: 'Já existe uma escola com esse nome.' });
        }

        const escola = new Escola({
            nome: nome.trim(),
            cidade: cidade?.trim() || '',
            uf: uf?.trim() || '',
            status: status || 'ATIVA',
            criado_por: req.usuario.id,
        });

        await escola.save();
        res.status(201).json(escola);
    } catch (error) {
        console.error('Erro ao criar escola:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Já existe uma escola com esse nome.' });
        }
        res.status(500).json({ message: 'Erro interno ao criar escola.' });
    }
};

/**
 * [PUT] Atualiza os dados de uma escola (apenas SUPER_ADMIN).
 */
export const atualizarEscola = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, cidade, uf, status } = req.body;

        const escola = await Escola.findById(id);
        if (!escola) {
            return res.status(404).json({ message: 'Escola não encontrada.' });
        }

        if (nome !== undefined) escola.nome = nome.trim();
        if (cidade !== undefined) escola.cidade = cidade.trim();
        if (uf !== undefined) escola.uf = uf.trim();
        if (status !== undefined) escola.status = status;

        await escola.save();
        res.status(200).json(escola);
    } catch (error) {
        console.error('Erro ao atualizar escola:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Já existe uma escola com esse nome.' });
        }
        res.status(500).json({ message: 'Erro interno ao atualizar escola.' });
    }
};

/**
 * [PATCH] Altera o status da escola (ATIVA/INATIVA).
 * Não há delete físico: a escola é a raiz de gincanas, equipes e resultados.
 */
export const alterarStatusEscola = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ATIVA', 'INATIVA'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido.' });
        }

        const escola = await Escola.findByIdAndUpdate(id, { status }, { new: true });
        if (!escola) {
            return res.status(404).json({ message: 'Escola não encontrada.' });
        }

        res.status(200).json(escola);
    } catch (error) {
        console.error('Erro ao alterar status da escola:', error);
        res.status(500).json({ message: 'Erro interno ao alterar status da escola.' });
    }
};

/**
 * [GET] Lista os usuários vinculados a uma escola (SUPER_ADMIN).
 */
export const listarUsuariosDaEscola = async (req, res) => {
    try {
        const { id } = req.params;

        const escola = await Escola.findById(id);
        if (!escola) {
            return res.status(404).json({ message: 'Escola não encontrada.' });
        }

        const usuarios = await Usuario
            .find(filtroEscola(id))
            .select('-senha')
            .sort({ nome: 1 });

        // `tipo`/`turma` saem já achatados no papel DESTA escola — a tela de
        // vínculos precisa mostrar o papel local, não o papel base.
        res.status(200).json(usuarios.map((u) => comVinculoDaEscola(u, id)));
    } catch (error) {
        console.error('Erro ao listar usuários da escola:', error);
        res.status(500).json({ message: 'Erro interno ao listar usuários da escola.' });
    }
};

/**
 * [POST] Vincula um usuário existente a uma escola (SUPER_ADMIN).
 * É este endpoint que permite um professor atuar em mais de uma escola.
 *
 * Aceita `usuario_id` ou `email` — o e-mail é o caminho prático na interface,
 * onde o SUPER_ADMIN não conhece o _id de alguém cadastrado em outra escola.
 *
 * O papel na escola nova é INDEPENDENTE dos demais vínculos. Quando `tipo` não
 * é informado, herda-se o papel base do usuário: um ADMIN entra como ADMIN na
 * escola nova, um COORDENADOR como COORDENADOR. Em nenhum caso o vínculo antigo
 * é alterado — era esse o bug de "virar aluno nas duas escolas".
 */
export const vincularUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id, email, tipo, turma } = req.body;

        if (!usuario_id && !email) {
            return res.status(400).json({ message: 'Informe usuario_id ou email.' });
        }

        if (tipo && !PERFIS_ESCOLA.includes(tipo)) {
            return res.status(400).json({
                message: `Perfil inválido. Use um destes: ${PERFIS_ESCOLA.join(', ')}.`,
            });
        }

        const escola = await Escola.findById(id);
        if (!escola) {
            return res.status(404).json({ message: 'Escola não encontrada.' });
        }

        const usuario = usuario_id
            ? await Usuario.findById(usuario_id)
            : await Usuario.findOne({ email: String(email).toLowerCase().trim() });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (getVinculo(usuario, id)) {
            return res.status(409).json({ message: 'Este usuário já está vinculado a esta escola.' });
        }

        // Escola única para perfis de participante: só ADMIN acumula escolas.
        // O papel efetivo é o informado ou, na falta dele, o papel base herdado
        // (mesma regra de aplicarVinculo) — a checagem precisa usar esse valor.
        const tipoEfetivo = tipo || (usuario.tipo === 'SUPER_ADMIN' ? 'ADMIN' : usuario.tipo);
        const conflito = conflitoMultiEscola(usuario, id, tipoEfetivo);
        if (conflito) {
            return res.status(409).json({ message: conflito, codigo: 'PERFIL_ESCOLA_UNICA' });
        }

        const vinculo = aplicarVinculo(usuario, id, { tipo, turma });
        await usuario.save();

        res.status(200).json({
            message: `${usuario.nome} vinculado(a) à escola ${escola.nome} como ${vinculo.tipo}.`,
            vinculo,
        });
    } catch (error) {
        console.error('Erro ao vincular usuário à escola:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, codigo: 'PERFIL_ESCOLA_UNICA' });
        }
        res.status(500).json({ message: 'Erro interno ao vincular usuário à escola.' });
    }
};

/**
 * [PATCH] Altera o papel do usuário DENTRO de uma escola (SUPER_ADMIN).
 *
 * Mexe apenas no vínculo daquela escola: o papel nas outras escolas em que a
 * pessoa atua permanece intacto.
 */
export const alterarPapelUsuario = async (req, res) => {
    try {
        const { id, usuarioId } = req.params;
        const { tipo, turma, status } = req.body;

        if (tipo && !PERFIS_ESCOLA.includes(tipo)) {
            return res.status(400).json({
                message: `Perfil inválido. Use um destes: ${PERFIS_ESCOLA.join(', ')}.`,
            });
        }

        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (usuario.tipo === 'SUPER_ADMIN') {
            return res.status(400).json({
                message: 'O SUPER_ADMIN é um perfil global e não tem papel por escola.',
            });
        }

        const vinculo = getVinculo(usuario, id);
        if (!vinculo) {
            return res.status(404).json({ message: 'Este usuário não está vinculado a esta escola.' });
        }

        if ((tipo === 'ALUNO' || tipo === 'COORDENADOR') && !(turma ?? vinculo.turma)) {
            return res.status(400).json({ message: 'Turma é obrigatória para alunos e coordenadores.' });
        }

        // Rebaixar um ADMIN multi-escola para um perfil de participante deixaria
        // a pessoa presa a duas escolas ao mesmo tempo; recusa antes de salvar.
        const conflito = conflitoMultiEscola(usuario, id, tipo || vinculo.tipo);
        if (conflito) {
            return res.status(409).json({ message: conflito, codigo: 'PERFIL_ESCOLA_UNICA' });
        }

        aplicarVinculo(usuario, id, { tipo, turma, status });
        await usuario.save();

        res.status(200).json({
            message: `Perfil de ${usuario.nome} nesta escola atualizado para ${vinculo.tipo}.`,
            usuario: comVinculoDaEscola(usuario, id),
        });
    } catch (error) {
        console.error('Erro ao alterar papel do usuário na escola:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, codigo: 'PERFIL_ESCOLA_UNICA' });
        }
        res.status(500).json({ message: 'Erro interno ao alterar o papel do usuário.' });
    }
};

/**
 * [DELETE] Remove o vínculo de um usuário com uma escola (SUPER_ADMIN).
 */
export const desvincularUsuario = async (req, res) => {
    try {
        const { id, usuarioId } = req.params;

        const usuario = await Usuario.findById(usuarioId);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Um usuário sem nenhuma escola fica sem acesso a nada; bloqueia o caso.
        const escolasDoUsuario = (usuario.vinculos || []).map((v) => String(v.escola_id));
        if (escolasDoUsuario.length <= 1 && escolasDoUsuario.includes(String(id)) && usuario.tipo !== 'SUPER_ADMIN') {
            return res.status(400).json({
                message: 'Este é o único vínculo do usuário. Vincule-o a outra escola antes de remover.',
            });
        }

        await Usuario.updateOne({ _id: usuarioId }, { $pull: { vinculos: { escola_id: String(id) } } });

        res.status(200).json({ message: 'Vínculo removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao desvincular usuário da escola:', error);
        res.status(500).json({ message: 'Erro interno ao desvincular usuário da escola.' });
    }
};

/**
 * [GET] Resumo de uma escola: contagem de gincanas e usuários (SUPER_ADMIN).
 */
export const obterResumoEscola = async (req, res) => {
    try {
        const { id } = req.params;

        const escola = await Escola.findById(id);
        if (!escola) {
            return res.status(404).json({ message: 'Escola não encontrada.' });
        }

        const [totalGincanas, totalUsuarios] = await Promise.all([
            Gincana.countDocuments({ escola_id: id }),
            Usuario.countDocuments(filtroEscola(id)),
        ]);

        res.status(200).json({ escola, totalGincanas, totalUsuarios });
    } catch (error) {
        console.error('Erro ao obter resumo da escola:', error);
        res.status(500).json({ message: 'Erro interno ao obter resumo da escola.' });
    }
};
