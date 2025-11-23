// src/feedbacks/feedbackController.js

import Feedback from '../models/Feedback.js';
import Usuario from '../models/Usuario.js';
import Notificacao from '../models/Notificacao.js';
import { criarNotificacao } from '../notificacoes/notificacaoController.js';
import { enviarEmailNovoFeedback, enviarEmailFeedbackRespondido } from '../utils/emailService.js';

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

        // Popula dados do usuário que enviou o feedback
        await feedbackSalvo.populate('criado_por_usuario_id', 'nome email tipo');

        // US17: Enviar notificações para ADMINs quando um feedback é criado
        try {
            // Buscar todos os usuários ADMIN que estão ativos
            const admins = await Usuario.find({
                tipo: 'ADMIN',
                status: 'ATIVO'
            }).select('_id nome email tipo');

            if (admins.length > 0) {
                // Criar notificações e enviar emails em paralelo (sem bloquear a resposta)
                const promessasNotificacoes = admins.map(async (admin) => {
                    try {
                        // Criar notificação no banco de dados
                        const titulo = 'Novo Feedback Recebido';
                        const nomeAutor = feedbackSalvo.criado_por_usuario_id?.nome || 'Usuário';
                        const mensagem = `${nomeAutor} enviou um novo feedback que requer sua análise.`;
                        
                        const notificacao = await criarNotificacao(
                            admin._id,
                            'COMUNICADO',
                            titulo,
                            mensagem,
                            null, // Não há prova relacionada
                            feedbackSalvo._id // Referência ao feedback
                        );

                        // Enviar email (não bloqueia se falhar)
                        const resultadoEmail = await enviarEmailNovoFeedback(
                            admin.email,
                            admin.nome,
                            feedbackSalvo,
                            feedbackSalvo.criado_por_usuario_id
                        );

                        // Atualizar notificação com status do email
                        if (resultadoEmail.sucesso && notificacao) {
                            await Notificacao.findByIdAndUpdate(notificacao._id, {
                                email_enviado: true,
                                email_enviado_em: new Date()
                            });
                        }
                    } catch (err) {
                        console.error(`Erro ao notificar admin ${admin._id}:`, err);
                    }
                });

                // Executa todas as notificações em paralelo
                Promise.all(promessasNotificacoes).catch(err => {
                    console.error('Erro ao processar notificações de feedback:', err);
                });
            }
        } catch (notificacaoError) {
            console.error('Erro ao enviar notificações de feedback:', notificacaoError);
        }

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

        // Encontra o feedback antes de atualizar (para pegar o criador)
        const feedbackOriginal = await Feedback.findById(id);
        
        if (!feedbackOriginal) {
            return res.status(404).json({ message: 'Feedback não encontrado.' });
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

        // Popula os dados do avaliador e do criador
        await feedbackAtualizado.populate('avaliado_por_usuario_id', 'nome email');
        await feedbackAtualizado.populate('criado_por_usuario_id', 'nome email tipo');

        // US17: Enviar notificação para o usuário que enviou o feedback
        try {
            const usuarioCriador = feedbackAtualizado.criado_por_usuario_id;
            const adminResposta = feedbackAtualizado.avaliado_por_usuario_id;

            if (usuarioCriador) {
                // Criar notificação no banco de dados
                const titulo = 'Feedback Respondido';
                const mensagem = `Seu feedback foi analisado e respondido pela administração.`;
                
                const notificacao = await criarNotificacao(
                    usuarioCriador._id,
                    'COMUNICADO',
                    titulo,
                    mensagem,
                    null, // Não há prova relacionada
                    feedbackAtualizado._id // Referência ao feedback
                );

                // Enviar email (não bloqueia se falhar)
                const resultadoEmail = await enviarEmailFeedbackRespondido(
                    usuarioCriador.email,
                    usuarioCriador.nome,
                    feedbackAtualizado,
                    adminResposta
                );

                // Atualizar notificação com status do email
                if (resultadoEmail.sucesso && notificacao) {
                    await Notificacao.findByIdAndUpdate(notificacao._id, {
                        email_enviado: true,
                        email_enviado_em: new Date()
                    });
                }
            }
        } catch (notificacaoError) {
            console.error('Erro ao enviar notificação de feedback respondido:', notificacaoError);
        }

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