// src/feedbacks/feedbackController.js

import Feedback from '../models/Feedback.js';

const GINCANA_ATUAL_ID = 'GINCANA_PRINCIPAL';

/**
 * [POST] Permite que qualquer usuário logado envie um feedback ou relate um problema.
 * Quem exerce: Todos os Perfis Logados
 */
export const enviarFeedback = async (req, res) => {
    try {
        // O ID do usuário logado vem do middleware de autenticação (req.usuario)
        const criado_por_usuario_id = req.usuario.id; 
        const { descricao } = req.body;

        if (!descricao) {
            return res.status(400).json({ message: 'A descrição do feedback é obrigatória.' });
        }
        
        if (descricao.length > 10000) {
             return res.status(400).json({ message: 'O feedback não pode exceder 10000 caracteres.' });
        }

        const novoFeedback = new Feedback({
            criado_por_usuario_id,
            gincana_id: GINCANA_ATUAL_ID,
            descricao,
            status: 'PENDENTE', // Novo feedback sempre começa como pendente
            // avaliado_por_usuario_id é deixado como null/default
        });

        const feedbackSalvo = await novoFeedback.save();

        res.status(201).json({ 
            message: 'Feedback enviado com sucesso! Agradecemos sua contribuição.',
            feedback: feedbackSalvo
        });

    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        res.status(500).json({ message: 'Erro interno ao processar o feedback.' });
    }
};

/**
 * [GET] Lista todos os feedbacks (apenas para ADMIN)
 */
export const listarFeedbacks = async (req, res) => {
     try {
        const feedbacks = await Feedback.find({})
            .sort({ criado_em: -1 }) // Ordena do mais novo para o mais antigo
            .populate('criado_por_usuario_id', 'nome email tipo') // Popula quem enviou
            .populate('avaliado_por_usuario_id', 'nome email'); // Popula quem analisou

        res.status(200).json(feedbacks);
    } catch (error) {
        console.error('Erro ao listar feedbacks:', error);
        res.status(500).json({ message: 'Erro interno ao listar feedbacks.' });
    }
};

/**
 * [PATCH] Permite ao ADMIN responder um feedback, atualizando o status para 'ANALISADO'.
 */
export const responderFeedback = async (req, res) => {
    try {
        const avaliado_por_usuario_id = req.usuario.id;
        const { id } = req.params; 
        const { resposta_admin } = req.body;

        if (!resposta_admin || resposta_admin.trim().length === 0) {
            return res.status(400).json({ message: 'A resposta do administrador é obrigatória.' });
        }
        
        if (resposta_admin.length > 2000) {
             return res.status(400).json({ message: 'A resposta não pode exceder 10000 caracteres.' });
        }

        // Encontra e atualiza o feedback
        const feedbackAtualizado = await Feedback.findByIdAndUpdate(
            id,
            { 
                status: 'ANALISADO',
                avaliado_por_usuario_id: avaliado_por_usuario_id,
                resposta_admin: resposta_admin
            },
            { new: true }
        );

        if (!feedbackAtualizado) {
            return res.status(404).json({ message: 'Feedback não encontrado.' });
        }

        // Popula os dados do avaliador para o frontend
        await feedbackAtualizado.populate('avaliado_por_usuario_id', 'nome email');

        res.status(200).json({
            message: `Feedback ${id} respondido e marcado como ANALISADO.`,
            feedback: feedbackAtualizado
        });

    } catch (error) {
        console.error('Erro ao responder feedback:', error);
        res.status(500).json({ message: 'Erro interno ao responder feedback.' });
    }
};

/**
 * [GET] Lista APENAS os feedbacks enviados pelo usuário logado.
 */
export const listarMeusFeedbacks = async (req, res) => {
    try {
        const usuarioId = req.usuario.id; 

        // Busca feedbacks onde o ID do usuário logado é o criador
        const feedbacks = await Feedback.find({ criado_por_usuario_id: usuarioId })
            .sort({ criado_em: -1 }) // Ordena do mais novo para o mais antigo
            .populate('avaliado_por_usuario_id', 'nome'); // Popula quem respondeu

        res.status(200).json(feedbacks);

    } catch (error) {
        console.error('Erro ao listar meus feedbacks:', error);
        res.status(500).json({ message: 'Erro interno ao buscar seus feedbacks.' });
    }
};