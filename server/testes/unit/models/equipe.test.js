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

    it('T1: deve criar Equipe, EquipeGincana e associar o Coordenador', async () => {
        const coordenador = await Usuario.create({ 
            nome: 'Coordenador T1', 
            email: 'coordenador.t1@test.com', 
            senha: '123', 
            tipo: 'COORDENADOR', 
        });

        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Integração Success',
                cor: '#33FF57',
                coordenador_usuario_id: coordenador._id.toString(),
            },
        };

        // chamar a função do controller
        await criarEquipe(req, res);

        // verifica a resposta enviada pelo controller
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Equipe criada e coordenador associado com sucesso.',
                equipe: expect.objectContaining({
                    nome: 'Equipe Integração Success',
                    total_membros: 1,
                    coordenador: expect.objectContaining({ nome: 'Coordenador T1' })
                })
            })
        );
        
        // verifica se os dados foram persistidos corretamente no banco
        const equipeCriada = await Equipe.findOne({ nome: 'Equipe Integração Success' });
        expect(equipeCriada).not.toBeNull();

        const equipeGincana = await EquipeGincana.findOne({ equipe_id: equipeCriada._id });
        expect(equipeGincana).not.toBeNull();
        expect(equipeGincana.coordenador_usuario_id.toString()).toBe(coordenador._id.toString());
        
        const membroCoordenador = await EquipeMembros.findOne({ usuario_id: coordenador._id });
        expect(membroCoordenador).not.toBeNull();
        expect(membroCoordenador.is_coordenador).toBe(true);
    });

    // ====================================================================
    // TESTE 2: CONFLITO (Coordenador já pertence a uma equipe)
    // ====================================================================

    it('T2: deve retornar 409 e não criar a equipe se o Coordenador já tiver equipe', async () => {
        const coordenador = await Usuario.create({ nome: 'Coordenador T2', email: 'coordenador.t2@test.com', senha: '123', tipo: 'COORDENADOR' });
        const equipeExistente = await Equipe.create({ nome: 'Equipe Antiga', cor: '#000' });
        const equipeGincanaExistente = await EquipeGincana.create({ equipe_id: equipeExistente._id, coordenador_usuario_id: coordenador._id, gincana_id: 'GINCANA_PRINCIPAL' });

        await EquipeMembros.create({ equipe_gincana_id: equipeGincanaExistente._id, equipe_id: equipeExistente._id, usuario_id: coordenador._id, is_coordenador: true });

        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Falha Conflito',
                cor: '#AABBCC',
                coordenador_usuario_id: coordenador._id.toString(),
            },
        };

        await criarEquipe(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Coordenador já pertence a outra equipe.' })
        );

        // verifica o Banco de Dados para garantir que a equipe Falha NÃO foi criada
        const equipeFalha = await Equipe.findOne({ nome: 'Equipe Falha Conflito' });
        expect(equipeFalha).toBeNull();
    });

    // ====================================================================
    // TESTE 3: FALHA (Dados obrigatórios faltando)
    // ====================================================================

    it('T3: deve retornar 400 se faltar o nome da equipe (validação do Controller)', async () => {
        const coordenador = await Usuario.create({ nome: 'Coordenador T3', email: 'coordenador.t3@test.com', senha: '123', tipo: 'COORDENADOR' });
        
        const res = mockResponse();
        const req = {
            body: {
                nome: '', // Falha aqui
                cor: '#AABBCC',
                coordenador_usuario_id: coordenador._id.toString(),
            },
        };

        await criarEquipe(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('obrigatórios') })
        );
        
        // Garante que o banco de dados não foi acessado, pq ele deve dar o erro 400 antes disso
        const count = await Equipe.countDocuments({ nome: '' });
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