import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Prova from '../../../src/models/Prova.js'; 

let mongoServer;

describe('Prova Model', () => {
    
    // inicia um servidor MongoDB na memória
      beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
      });
    
      // para o servidor e desconecta
      afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
      });

      // limpa os dados para garantir que um teste não interfira no outro
      afterEach(async () => {
        await Prova.deleteMany({});
      });

    // Os dados básicos para criar a prova
    const baseProvaData = {
        titulo: 'Prova Base',
        descricao: 'Dados mínimos',
        pontuacao: { "1_lugar": 100, "2_lugar": 75 },
        data_inicio: "2025-11-10T09:00:00.000Z",
        criado_por_usuario_id: new mongoose.Types.ObjectId(),
    };

    // Não criei uma função que normalmente faz parte que é de deletar depois do teste por que deleta tudo da collection e eu queria deixar lá como prova e monitoração
    
    // ==========================================================================
    // GRUPO DE TESTES PARA A US01 - CRIAR PROVA COM DADOS BÁSICOS
    // ==========================================================================
    describe('US01 - Criação com dados básicos', () => {
        // --------------------------------------------------------------------------
        // US01.1 - Teste principal com todos os campos preenchidos
        // --------------------------------------------------------------------------
        it('deve salvar uma prova com dados válidos e aplicar os valores padrão', async () => {
        const prova = new Prova(baseProvaData);
        const provaSalva = await prova.save();

        expect(provaSalva._id).toBeDefined();
        expect(provaSalva.titulo).toBe('Prova Base');
        // Confirma que os valores PADRÃO (default) do Schema foram aplicados
        expect(provaSalva.status).toBe('NAO_INICIADA');
        expect(provaSalva.formato).toBe('PROVA_PRATICA');
        });

        // --------------------------------------------------------------------------
        // US01.2 - Falha no cadastro de uma prova sem um campo obrigatório informado
        // --------------------------------------------------------------------------
        it('deve falhar a validação se um campo obrigatório (título) estiver faltando', async () => {
            const dadosInvalidos = { ...baseProvaData };
            delete dadosInvalidos.titulo;

            const prova = new Prova(dadosInvalidos);
            await expect(prova.save()).rejects.toThrow(mongoose.Error.ValidationError);
        });

        // --------------------------------------------------------------------------
        // US01.3 - Falha no cadastro de uma prova informando um formato inválido
        // --------------------------------------------------------------------------
        it('deve falhar a validação se um valor de enum (formato) for inválido', async () => {
            const dadosInvalidos = { ...baseProvaData, formato: 'ENTREVISTA' };

            const prova = new Prova(dadosInvalidos);
            
            await expect(prova.save()).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });

    // ==========================================================================
    // GRUPO DE TESTES PARA A US02 - QUESITOS DE AVALIAÇÃO
    // ==========================================================================
    describe('US02 - Evaluation Criteria (quesitos_de_avaliacao)', () => {
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
});