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
    // GRUPO DE TESTES PARA A US02 - CATEGORIAS DE BÔNUS (bonus_categorias)
    // ==========================================================================
    describe('US02 - Categorias de bônus (bonus_categorias)', () => {
        // --------------------------------------------------------------------------
        // US02.1 - Teste principal com múltiplas categorias de bônus válidas
        // --------------------------------------------------------------------------

        it('deve salvar uma prova com MÚLTIPLAS categorias de bônus válidas', async () => {
            const provaData = {
                ...baseProvaData,
                bonus_categorias: [
                    { chave: 'EX_ALUNOS', nome: 'Ex-alunos', pontos_por_unidade: 20, teto_unidades: 5 },
                    { chave: 'PAIS_MAES', nome: 'Pais/Mães', pontos_por_unidade: 20, teto_unidades: 5 },
                ],
            };

            const novaProva = new Prova(provaData);
            const provaSalva = await novaProva.save();

            expect(provaSalva.bonus_categorias).toHaveLength(2);
            expect(provaSalva.bonus_categorias[0].toObject()).toMatchObject({
                chave: 'EX_ALUNOS', nome: 'Ex-alunos', pontos_por_unidade: 20, teto_unidades: 5,
            });
        });

        // --------------------------------------------------------------------------
        // US02.2 - Rejeita categoria de bônus sem os campos obrigatórios
        // --------------------------------------------------------------------------

        it('deve rejeitar e falhar a validação se uma categoria de bônus não tiver "nome"', async () => {
            const provaData = {
                ...baseProvaData,
                titulo: 'Prova Inválida',
                bonus_categorias: [{ chave: 'EX_ALUNOS', pontos_por_unidade: 20 }],
            };

            let erro;
            try {
                const prova = new Prova(provaData);
                await prova.validate();
            } catch (e) {
                erro = e;
            }

            expect(erro).toBeInstanceOf(mongoose.Error.ValidationError);
            expect(erro.message).toMatch(/bonus_categorias/i);
        });

        // --------------------------------------------------------------------------
        // US02.3 - Testa o array sendo enviado vazio (é permitido e também uma boa prática)
        // --------------------------------------------------------------------------

        it('deve salvar uma prova com array de bonus_categorias vazio se nenhum for fornecido', async () => {
            const provaData = {
                ...baseProvaData,
                // Não contém o campo bonus_categorias (deve ir vazio)
            };

            const novaProva = new Prova(provaData);
            const provaSalva = await novaProva.save();

            // O campo deve ser um array vazio por causa do 'default: []' no schema do models
            expect(provaSalva.bonus_categorias).toEqual([]);
            expect(provaSalva.bonus_categorias).toHaveLength(0);
        });

        // --------------------------------------------------------------------------
        // US02.4 - teto_unidades é opcional (null = sem teto)
        // --------------------------------------------------------------------------

        it('deve aceitar uma categoria de bônus sem teto_unidades (sem teto)', async () => {
            const provaData = {
                ...baseProvaData,
                bonus_categorias: [{ chave: 'DOACOES', nome: 'Doações', pontos_por_unidade: 2 }],
            };

            const novaProva = new Prova(provaData);
            const provaSalva = await novaProva.save();

            expect(provaSalva.bonus_categorias[0].teto_unidades).toBeNull();
        });
    });
});