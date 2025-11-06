// src/models/Feedback.test.js

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Feedback from '../../../src/models/Feedback.js';

let mongoServer;

// --- Setup do Ambiente de Teste (Padrão) ---
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Limpa a coleção antes de cada teste
beforeEach(async () => {
    await Feedback.deleteMany({});
});


describe('US18: Testes Unitários para o Modelo Feedbacks', () => {
    const usuarioId = new mongoose.Types.ObjectId();
    const avaliadorId = new mongoose.Types.ObjectId();

    // --- TESTE 1: Caminho Feliz e Valores Padrão ---
    it('deve criar e salvar um feedback com sucesso e aplicar valores padrão', async () => {
        // Arrange
        const dadosValidos = {
            criado_por_usuario_id: usuarioId,
            descricao: 'Sugestão: Adicionar um ranking por turma.',
        };
        const feedback = new Feedback(dadosValidos);

        // Act
        const feedbackSalvo = await feedback.save();

        // Assert
        expect(feedbackSalvo._id).toBeDefined();
        expect(feedbackSalvo.descricao).toBe(dadosValidos.descricao);
        
        // Verifica Valores Padrão
        expect(feedbackSalvo.status).toBe('PENDENTE');
        expect(feedbackSalvo.gincana_id).toBe('GINCANA_PRINCIPAL');
        expect(feedbackSalvo.avaliado_por_usuario_id).toBeNull();
    });

    // --- TESTE 2: Campos Obrigatórios ---
    it('não deve salvar se o campo "criado_por_usuario_id" estiver faltando', async () => {
        // Arrange: Falta o ID do criador
        const dadosInvalidos = {
            descricao: 'Descrição sem ID de usuário.',
        };
        const feedback = new Feedback(dadosInvalidos);

        // Act & Assert: Espera erro de validação
        await expect(feedback.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('não deve salvar se a "descricao" estiver faltando', async () => {
        // Arrange: Falta a descrição
        const dadosInvalidos = {
            criado_por_usuario_id: usuarioId,
        };
        const feedback = new Feedback(dadosInvalidos);

        // Act & Assert
        await expect(feedback.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
    
    // --- TESTE 3: Limite de Caracteres ---
    it('não deve salvar se a "descricao" exceder 10000 caracteres', async () => {
        // Arrange: Cria uma string com 10001 caracteres
        const descricaoLonga = 'A'.repeat(10001);
        const dadosLongos = {
            criado_por_usuario_id: usuarioId,
            descricao: descricaoLonga,
        };
        const feedback = new Feedback(dadosLongos);

        // Act & Assert
        await expect(feedback.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
    
    it('não deve salvar se a "resposta_admin" exceder 10000 caracteres', async () => {
        // Arrange: Cria uma string com 10001 caracteres
        const respostaLonga = 'R'.repeat(10001);
        const dadosLongos = {
            criado_por_usuario_id: usuarioId,
            descricao: 'Descrição válida',
            resposta_admin: respostaLonga,
        };
        const feedback = new Feedback(dadosLongos);

        // Act & Assert
        await expect(feedback.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });


    // --- TESTE 4: Enum de Status ---
    it('não deve salvar se o "status" for um valor inválido', async () => {
        // Arrange: Tenta usar um status que não existe no enum
        const dadosInvalidos = {
            criado_por_usuario_id: usuarioId,
            descricao: 'Descrição válida',
            status: 'APROVADO', // Não está no ENUM: PENDENTE, ANALISADO, RESPONDIDO
        };
        const feedback = new Feedback(dadosInvalidos);

        // Act & Assert
        await expect(feedback.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
    
    // --- TESTE 5: Status RESPONDIDO Completo ---
    it('deve salvar corretamente um feedback no status ANALISADO com todos os campos preenchidos', async () => {
        // Arrange: Simula o feedback após a resposta do Admin
        const dadosCompletos = {
            criado_por_usuario_id: usuarioId,
            descricao: 'Erro de pontuação',
            status: 'ANALISADO',
            resposta_admin: 'O erro foi corrigido na base de dados.',
            avaliado_por_usuario_id: avaliadorId
        };
        const feedback = new Feedback(dadosCompletos);

        // Act
        const feedbackSalvo = await feedback.save();

        // Assert
        expect(feedbackSalvo.status).toBe('ANALISADO');
        expect(feedbackSalvo.resposta_admin).toBe(dadosCompletos.resposta_admin);
        expect(feedbackSalvo.avaliado_por_usuario_id).toEqual(avaliadorId);
    });

});