import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Equipe from '../../../src/models/Equipe.js'; 
import Usuario from '../../../src/models/Usuario.js'; 
import EquipeGincana from '../../../src/models/EquipeGincana.js'; 
import EquipeMembros from '../../../src/models/EquipeMembros.js';
import { criarEquipe } from '../../../src/equipes/equipeController.js';

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};

const mockAdminId = new mongoose.Types.ObjectId();
const mockAdminUsuario = { id: mockAdminId.toString(), tipo: 'ADMIN' };

let mongoServer;
// Conexão com o banco
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        await EquipeMembros.createIndexes();
        await Equipe.createIndexes(); // garante o índice único de "nome"
    });
    
    // para o servidor e desconecta
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

      // limpa os dados para garantir que um teste não interfira no outro
    beforeEach(async () => {
        // Apaga os dados de todas as coleções relevantes
        await Usuario.deleteMany({});
        await Equipe.deleteMany({});
        await EquipeGincana.deleteMany({});
        await EquipeMembros.deleteMany({});
    });

describe('US06: Teste de Integração de criarEquipe', () => {

    // IDS para limpeza do que for adicionado
    let createdEquipesIds = [];
    let createdGincanaIds = [];
    // ====================================================================
    // TESTE 1: CRIAÇÃO BEM-SUCEDIDA
    // ====================================================================

    // Observação: o controller criarEquipe foi simplificado e hoje recebe apenas
    // { nome, cor }. A equipe é criada SEM coordenador ("Coordenador pendente"),
    // que é associado depois por um fluxo próprio. Os testes refletem esse
    // comportamento atual.

    it('T1: deve criar a Equipe e o EquipeGincana sem coordenador (pendente)', async () => {
        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Integração Success',
                cor: '#33FF57',
            },
        };

        // chamar a função do controller
        await criarEquipe(req, res);

        // verifica a resposta enviada pelo controller
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Equipe criada com sucesso. Coordenador pendente.',
                equipe: expect.objectContaining({
                    nome: 'Equipe Integração Success',
                    cor: '#33FF57',
                    total_membros: 0,
                    coordenador: null,
                })
            })
        );

        // verifica se os dados foram persistidos corretamente no banco
        const equipeCriada = await Equipe.findOne({ nome: 'Equipe Integração Success' });
        expect(equipeCriada).not.toBeNull();

        const equipeGincana = await EquipeGincana.findOne({ equipe_id: equipeCriada._id });
        expect(equipeGincana).not.toBeNull();
        expect(equipeGincana.coordenador_usuario_id).toBeNull();

        // Nenhum membro é criado na criação da equipe
        const totalMembros = await EquipeMembros.countDocuments({ equipe_id: equipeCriada._id });
        expect(totalMembros).toBe(0);
    });

    // ====================================================================
    // TESTE 2: CONFLITO (Nome de equipe já existente)
    // ====================================================================

    it('T2: deve retornar 409 se o nome da equipe já existir', async () => {
        await Equipe.create({ nome: 'Equipe Repetida', cor: '#000' });

        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Repetida', // nome duplicado
                cor: '#AABBCC',
            },
        };

        await criarEquipe(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Nome da equipe já existe.' })
        );

        // garante que não duplicou a equipe
        const total = await Equipe.countDocuments({ nome: 'Equipe Repetida' });
        expect(total).toBe(1);
    });

    // ====================================================================
    // TESTE 3: FALHA (Dados obrigatórios faltando)
    // ====================================================================

    it('T3: deve retornar 400 se faltar a cor da equipe (validação do Controller)', async () => {
        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Sem Cor',
                cor: '', // Falha aqui
            },
        };

        await criarEquipe(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('obrigatórios') })
        );

        // Garante que nada foi persistido (validação acontece antes de tocar o banco)
        const count = await Equipe.countDocuments({ nome: 'Equipe Sem Cor' });
        expect(count).toBe(0);
    });
});

// ====================================================================
//                  TESTES PARA A US07
// ====================================================================

describe('Gerenciamento de Equipes - US07 (Coordenador)', () => {

    // ====================================================================
    // TESTE 1: Adição de membro em equipe com sucesso
    // ====================================================================
    it('deve criar e salvar um membro de equipe com sucesso', async () => {
        const dadosValidos = {
            equipe_id: new mongoose.Types.ObjectId(),
            usuario_id: new mongoose.Types.ObjectId(),
            is_coordenador: false
        };
        const membro = new EquipeMembros(dadosValidos);

        const membroSalvo = await membro.save();

        // Assert: Verifica se o documento foi salvo corretamente
        expect(membroSalvo._id).toBeDefined();
        expect(membroSalvo.equipe_id).toEqual(dadosValidos.equipe_id);
        expect(membroSalvo.usuario_id).toEqual(dadosValidos.usuario_id);
        expect(membroSalvo.is_coordenador).toBe(false);
    });

    // ====================================================================
    // TESTE 2: FALHA (Dados obrigatórios faltando)
    // ====================================================================
    it('não deve salvar se o campo "usuario_id" estiver faltando', async () => {
        // Arrange: Cria um objeto sem o campo obrigatório 'usuario_id'
        const dadosInvalidos = {
            equipe_id: new mongoose.Types.ObjectId(),
            is_coordenador: false
        };
        const membro = new EquipeMembros(dadosInvalidos);

        // Act & Assert: Tenta salvar e espera que uma exceção de validação seja lançada
        let erro;
        try {
            await membro.save();
        } catch (e) {
            erro = e;
        }

        expect(erro).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(erro.errors.usuario_id).toBeDefined(); // Confirma que o erro é no campo 'usuario_id'
    });
    // ====================================================================
    // TESTE 3: FALHA (Dados obrigatórios faltando)
    // ====================================================================
    it('não deve salvar se o campo "equipe_id" estiver faltando', async () => {
        const dadosInvalidos = {
            usuario_id: new mongoose.Types.ObjectId(),
            is_coordenador: false
        };
        const membro = new EquipeMembros(dadosInvalidos);

        let erro;
        try {
            await membro.save();
        } catch (e) {
            erro = e;
        }

        expect(erro).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(erro.errors.equipe_id).toBeDefined();
    });

    // ====================================================================
    // TESTE 4: Valor padrão de is_coordenador
    // ====================================================================
    it("deve atribuir 'is_coordenador' como false por padrão se não for fornecido", async () => {
        const dadosComDefault = {
            equipe_id: new mongoose.Types.ObjectId(),
            usuario_id: new mongoose.Types.ObjectId(),
        };
        const membro = new EquipeMembros(dadosComDefault);

        const membroSalvo = await membro.save();

        // verifica se o valor padrão foi aplicado
        expect(membroSalvo.is_coordenador).toBe(false);
    });

});