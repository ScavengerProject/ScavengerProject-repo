import mongoose from 'mongoose';
import Equipe from '../../../src/models/Equipe.js'; 
import Usuario from '../../../src/models/Usuario.js'; 
import EquipeGincana from '../../../src/models/EquipeGincana.js'; 
import { criarEquipe } from '../../../src/equipes/equipeController.js';

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    return res;
};

const mockAdminId = new mongoose.Types.ObjectId();
const mockAdminUsuario = { id: mockAdminId.toString(), tipo: 'ADMIN' };
const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/gincana_test';

describe('US06: Teste de Integração de criarEquipe (Sem Mocking)', () => {

    // IDS para limpeza do que for adicionado
    let usuarioCoordenador;
    let createdEquipesIds = [];
    let createdGincanaIds = [];
    
    // Conexão com o banco
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(TEST_MONGO_URI);
        }
        
        // Criei um usuário Coordenador e Admin para teste no banco
        usuarioCoordenador = await Usuario.create({ 
            _id: mockAdminId, 
            nome: 'Coord Teste', 
            email: 'coord_i@test.com', 
            senha: 'admin123', 
            tipo: 'ADMIN', 
            status: 'ATIVO' 
        });
    });

    // LIMPEZA APÓS CADA TESTE
    afterEach(async () => {
        // Limpa Equipes e EquipesGincana criadas
        await Equipe.deleteMany({ _id: { $in: createdEquipesIds } });
        await EquipeGincana.deleteMany({ _id: { $in: createdGincanaIds } });
        createdEquipesIds = [];
        createdGincanaIds = [];
        
        // Reseta o campo equipe_id do usuário coordenador
        await Usuario.findByIdAndUpdate(mockAdminId, { equipe_id: null });
    });

    afterAll(async () => {
        // Remove o usuário de teste criado
        await Usuario.findByIdAndDelete(mockAdminId);
        await mongoose.connection.close();
    });

    // ====================================================================
    // TESTE 1: CRIAÇÃO BEM-SUCEDIDA
    // ====================================================================

    it('T1: deve criar Equipe, EquipeGincana e associar o Coordenador', async () => {
        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Integração Success',
                cor: '#33FF57',
                coordenador_usuario_id: mockAdminId.toString(),
            },
            usuario: mockAdminUsuario,
        };

        await criarEquipe(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        
        const equipeMestre = await Equipe.findOne({ nome: 'Equipe Integração Success' });
        const usuarioAtualizado = await Usuario.findById(mockAdminId);

        // Salva os IDS pra limpar
        createdEquipesIds.push(equipeMestre._id);
        const equipeGincana = await EquipeGincana.findOne({ equipe_id: equipeMestre._id });
        createdGincanaIds.push(equipeGincana._id);

        // asserções no banco
        expect(equipeMestre).toBeDefined();
        expect(equipeGincana).toBeDefined();
        expect(equipeMestre.membros).toHaveLength(1);
        expect(usuarioAtualizado.equipe_id.toString()).toBe(equipeMestre._id.toString());
    });

    // ====================================================================
    // TESTE 2: CONFLITO (Coordenador já pertence a uma equipe)
    // ====================================================================

    it('T2: deve retornar 409 e não criar a equipe se o Coordenador já tiver equipe', async () => {
        // Coloquei o coordenador em uma equipe temporária no BD antes do teste
        const equipeConflito = await Equipe.create({ nome: 'Conflito', cor: '#000000', membros: [mockAdminId] });
        await Usuario.findByIdAndUpdate(mockAdminId, { equipe_id: equipeConflito._id });
        
        // Salva os IDS pra limpar
        createdEquipesIds.push(equipeConflito._id);

        const res = mockResponse();
        const req = {
            body: {
                nome: 'Equipe Falha Conflito',
                cor: '#AABBCC',
                coordenador_usuario_id: mockAdminId.toString(),
            },
            usuario: mockAdminUsuario,
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
        const res = mockResponse();
        const req = {
            body: {
                nome: '', // Falha aqui
                cor: '#AABBCC',
                coordenador_usuario_id: mockAdminId.toString(),
            },
            usuario: mockAdminUsuario,
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