import mongoose from 'mongoose';
import Prova from '../../../src/models/Prova.js'; 

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/gincana_test';

describe('Prova Model (US02 - Quesitos de Avaliação)', () => {
    
    // To conectando aqui, antes de tudo parqa evitar fazer isso toda vez
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(TEST_MONGO_URI);
        }
    });

    // Desconecta depois de todos os testes
    afterAll(async () => {
        await mongoose.connection.close();
    });

    // Os dados básicos para criar a prova
    const baseProvaData = {
        titulo: 'Prova Base',
        descricao: 'Dados mínimos',
        formato: 'CRIATIVA',
        criado_por_usuario_id: new mongoose.Types.ObjectId(),
    };

    // Não criei uma função que normalmente faz parte que é de deletar depois do teste por que deleta tudo da collection e eu queria deixar lá como prova e monitoração
    
    // --------------------------------------------------------------------------
    // US02.1 - Teste principal com todos os quesitos de avaliação
    // --------------------------------------------------------------------------

    it('deve salvar uma prova com MÚLTIPLOS quesitos de avaliação válidos', async () => {
        const provaData = {
            ...baseProvaData, // Os dados base pra criar a prova
            quesitos_de_avaliacao: ['TEMPO', 'PRODUTIVIDADE'],  // Os dois quesitos adicionados
        };

        const novaProva = new Prova(provaData);
        const provaSalva = await novaProva.save();

        expect(provaSalva.quesitos_de_avaliacao).toEqual(['TEMPO', 'PRODUTIVIDADE']);
        expect(provaSalva.quesitos_de_avaliacao).toHaveLength(2);
        expect(provaSalva.quesitos_de_avaliacao).toBeInstanceOf(Array);
    });

    // --------------------------------------------------------------------------
    //  US02.2 - Rejeita a criação da prova quando tiver um quesito que não está predescrito no ENUM
    // --------------------------------------------------------------------------

    it('deve rejeitar e falhar a validação se um quesito no array for inválido (fora do ENUM)', async () => {
        const provaData = {
            ...baseProvaData,
            titulo: 'Prova Inválida',
            quesitos_de_avaliacao: ['TEMPO', 'FORCA'],  // O teste deve falhar com 'FORCA'
        };

        let erro;
        try {
            const prova = new Prova(provaData);
            await prova.validate();
        } catch (e) {
            erro = e;
        }

        // Tem que sinalizar um erro e deve ser um ValidationError
        expect(erro).toBeInstanceOf(mongoose.Error.ValidationError);

        // Verifica se a mensagem de erro (a string completo) menciona o campo e o valor inválido
        expect(erro.message).toMatch(/quesitos_de_avaliacao/i);
        expect(erro.message).toMatch(/FORCA/i);
    });
    
    // --------------------------------------------------------------------------
    // US02.3 - Testa o array sendo enviado vazio (é permitido e também uma boa prática)
    // --------------------------------------------------------------------------

    it('deve salvar uma prova com array de quesitos vazio se nenhum for fornecido', async () => {
        const provaData = {
            ...baseProvaData,
            // Não contém o campo quesitos_de_avaliacao (deve ir vazio)
        };

        const novaProva = new Prova(provaData);
        const provaSalva = await novaProva.save();
        
        // O campo deve ser um array vazio por causa do 'default: []' no schema do models
        expect(provaSalva.quesitos_de_avaliacao).toEqual([]);
        expect(provaSalva.quesitos_de_avaliacao).toHaveLength(0);
    });
});