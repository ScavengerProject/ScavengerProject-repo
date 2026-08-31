/**
 * Testes de borda do multi-escola: a fronteira ADMIN x SUPER_ADMIN.
 *
 * Diferente dos demais testes de auth (que chamam os middlewares direto), aqui
 * a requisição passa pelo Express de verdade — token JWT assinado, headers
 * X-Escola-Id/X-Gincana-Id e a cadeia completa de middlewares do router. É o
 * único jeito de provar que o ENCADEAMENTO das rotas está certo: um
 * `autorizar('SUPER_ADMIN')` esquecido numa rota nova não aparece em teste de
 * controller, porque o controller nunca soube quem podia chamá-lo.
 *
 * Duas regras sob teste:
 *  1. ADMIN administra UMA ESCOLA — não cria/edita escolas nem mexe em
 *     vínculos; isso é privativo do SUPER_ADMIN.
 *  2. SUPER_ADMIN é superconjunto do ADMIN: tudo que o ADMIN faz, ele faz, em
 *     qualquer escola e sem precisar de vínculo.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Escola from '../../../src/models/Escola.js';
import Gincana from '../../../src/models/Gincana.js';
import Usuario from '../../../src/models/Usuario.js';
import CodigoConvite from '../../../src/models/CodigoConvite.js';
import escolaRoutes from '../../../src/escolas/escolaRoutes.js';
import gincanaRoutes from '../../../src/gincanas/gincanaRoutes.js';
import usuarioRoutes from '../../../src/usuarios/usuarioRoutes.js';

const ESCOLA_A = 'ESCOLA_A';
const ESCOLA_B = 'ESCOLA_B';
const ANO = new Date().getFullYear();
const ID_QUALQUER = '000000000000000000000000';

let mongoServer;
let app;

// Atores das suítes (recriados a cada teste).
let superAdmin;   // SUPER_ADMIN global, sem vínculo
let adminA;       // ADMIN só da escola A
let alunoA;       // ALUNO da escola A

/** App mínimo com os routers reais — sem tocar em src/index.js (que conecta no Mongo). */
const criarApp = () => {
    const server = express();
    server.use(express.json());
    server.use('/api/escolas', escolaRoutes);
    server.use('/api/gincanas', gincanaRoutes);
    server.use('/api/usuarios', usuarioRoutes);
    return server;
};

/** Token igual ao emitido pelo login: carrega apenas o papel BASE do usuário. */
const tokenDe = (usuario) => jwt.sign(
    { id: usuario._id.toString(), nome: usuario.nome, tipo: usuario.tipo },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
);

/** Requisição autenticada e com escopo: `como(adminA)('post', '/api/escolas')`. */
const como = (usuario, { escola = ESCOLA_A, gincana } = {}) => (metodo, url) => {
    const req = request(app)[metodo](url).set('Authorization', `Bearer ${tokenDe(usuario)}`);
    if (escola) req.set('X-Escola-Id', escola);
    if (gincana) req.set('X-Gincana-Id', gincana);
    return req;
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = criarApp();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    const criador = new mongoose.Types.ObjectId();

    await Escola.create([
        { _id: ESCOLA_A, nome: 'Escola A', status: 'ATIVA', criado_por: criador },
        { _id: ESCOLA_B, nome: 'Escola B', status: 'ATIVA', criado_por: criador },
    ]);

    superAdmin = await Usuario.create({
        nome: 'Root', email: 'root@x.com', senha: '123456', tipo: 'SUPER_ADMIN', vinculos: [],
    });
    adminA = await Usuario.create({
        nome: 'Admin A', email: 'admin.a@x.com', senha: '123456', tipo: 'ADMIN',
        vinculos: [{ escola_id: ESCOLA_A, tipo: 'ADMIN' }],
    });
    alunoA = await Usuario.create({
        nome: 'Aluno A', email: 'aluno.a@x.com', senha: '123456', tipo: 'ALUNO', turma: 'EF - 6º Ano',
        vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
    });

    await Gincana.create({
        _id: 'GINCANA_A', escola_id: ESCOLA_A, nome: 'Gincana A', ano: ANO, criado_por: criador,
    });
});

afterEach(async () => {
    await Promise.all([
        Escola.deleteMany({}),
        Gincana.deleteMany({}),
        Usuario.deleteMany({}),
        CodigoConvite.deleteMany({}),
    ]);
});

/* ------------------------------------------------------------------------ */

describe('ADMIN não alcança as rotas privativas do SUPER_ADMIN', () => {
    const rotas = [
        ['get', '/api/escolas', undefined],
        ['post', '/api/escolas', { nome: 'Escola Pirata' }],
        ['put', `/api/escolas/${ESCOLA_A}`, { nome: 'Escola A Renomeada' }],
        ['patch', `/api/escolas/${ESCOLA_A}/status`, { status: 'INATIVA' }],
        ['get', `/api/escolas/${ESCOLA_A}/resumo`, undefined],
        ['get', `/api/escolas/${ESCOLA_A}/usuarios`, undefined],
        ['post', `/api/escolas/${ESCOLA_A}/usuarios`, { email: 'aluno.a@x.com' }],
        ['patch', `/api/escolas/${ESCOLA_A}/usuarios/${ID_QUALQUER}/papel`, { tipo: 'ADMIN' }],
        ['delete', `/api/escolas/${ESCOLA_A}/usuarios/${ID_QUALQUER}`, undefined],
    ];

    it.each(rotas)('ADMIN recebe 403 em %s %s', async (metodo, url, corpo) => {
        const res = await como(adminA)(metodo, url).send(corpo || {});

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/SUPER_ADMIN/);
    });

    it('varre o router de escolas: toda rota não-pública barra o ADMIN', async () => {
        // Guarda de regressão: se alguém adicionar uma rota nova em
        // escolaRoutes.js e esquecer o autorizar('SUPER_ADMIN'), este teste
        // quebra sozinho — sem depender de alguém lembrar de escrever o caso.
        const abertas = ['/minhas'];

        const doRouter = escolaRoutes.stack
            .filter((camada) => camada.route && !abertas.includes(camada.route.path))
            .flatMap((camada) => Object.keys(camada.route.methods)
                .filter((m) => m !== '_all')
                .map((metodo) => ({
                    metodo,
                    url: `/api/escolas${camada.route.path}`
                        .replace(':usuarioId', alunoA._id.toString())
                        .replace(':id', ESCOLA_A),
                })));

        expect(doRouter.length).toBeGreaterThanOrEqual(9);

        for (const { metodo, url } of doRouter) {
            const res = await como(adminA)(metodo, url).send({});
            expect(`${metodo.toUpperCase()} ${url} -> ${res.status}`)
                .toBe(`${metodo.toUpperCase()} ${url} -> 403`);
        }
    });

    it('o 403 do ADMIN acontece ANTES de qualquer efeito no banco', async () => {
        await como(adminA)('post', '/api/escolas').send({ nome: 'Escola Pirata' });
        await como(adminA)('put', `/api/escolas/${ESCOLA_A}`).send({ nome: 'Renomeada' });
        await como(adminA)('patch', `/api/escolas/${ESCOLA_A}/status`).send({ status: 'INATIVA' });
        await como(adminA)('delete', `/api/escolas/${ESCOLA_A}/usuarios/${alunoA._id}`).send({});

        expect(await Escola.countDocuments()).toBe(2);
        const escolaA = await Escola.findById(ESCOLA_A);
        expect(escolaA.nome).toBe('Escola A');
        expect(escolaA.status).toBe('ATIVA');
        expect((await Usuario.findById(alunoA._id)).vinculos).toHaveLength(1);
    });

    it('ADMIN não vira SUPER_ADMIN trocando o header de escola', async () => {
        // Ele é ADMIN na A; apontando para a B (onde não tem vínculo) o
        // resolverEscola corta com SEM_VINCULO_ESCOLA — não existe "promoção".
        const res = await como(adminA, { escola: ESCOLA_B })('get', '/api/usuarios');

        expect(res.status).toBe(403);
        expect(res.body.codigo).toBe('SEM_VINCULO_ESCOLA');
    });
});

describe('escalonamento de privilégio pelo cadastro de usuários', () => {
    it('ADMIN não cria um SUPER_ADMIN', async () => {
        const res = await como(adminA)('post', '/api/usuarios').send({
            nome: 'Falso Root', email: 'falso@x.com', senha: '123456', tipo: 'SUPER_ADMIN',
        });

        expect(res.status).toBe(403);
        expect(await Usuario.findOne({ email: 'falso@x.com' })).toBeNull();
    });

    it('ADMIN não se autopromove a SUPER_ADMIN', async () => {
        const res = await como(adminA)('put', `/api/usuarios/${adminA._id}`).send({ tipo: 'SUPER_ADMIN' });

        expect(res.status).toBe(403);
        expect((await Usuario.findById(adminA._id)).tipo).toBe('ADMIN');
    });

    it('ADMIN não promove outra pessoa a SUPER_ADMIN', async () => {
        const res = await como(adminA)('put', `/api/usuarios/${alunoA._id}`).send({ tipo: 'SUPER_ADMIN' });

        expect(res.status).toBe(403);
        expect((await Usuario.findById(alunoA._id)).tipo).toBe('ALUNO');
    });

    it('o auto-cadastro público ignora "tipo" e "escola_id" enviados no corpo', async () => {
        // Mass assignment: a rota é aberta, então o corpo é hostil por definição.
        // A escola só pode vir de um código de convite válido — nunca do corpo.
        const convite = await CodigoConvite.create({
            codigo: 'ABCD1234', escola_id: ESCOLA_A, turma: 'EF - 6º Ano', aprovacao_automatica: true,
            ano_letivo: ANO, expira_em: new Date(Date.now() + 86400000), criado_por: superAdmin._id,
        });

        const res = await request(app).post('/api/usuarios/registro').send({
            nome: 'Intruso', email: 'intruso@x.com', senha: '123456',
            escola_id: ESCOLA_B, tipo: 'SUPER_ADMIN', codigo: convite.codigo,
        });

        expect(res.status).toBe(201);
        const criado = await Usuario.findOne({ email: 'intruso@x.com' });
        expect(criado.tipo).toBe('ALUNO');
        expect(criado.vinculos[0].tipo).toBe('ALUNO');
        // escola_id do corpo (ESCOLA_B) foi ignorado: a escola vem do convite (A).
        expect(criado.vinculos[0].escola_id).toBe(ESCOLA_A);
    });

    it('SUPER_ADMIN cria outro SUPER_ADMIN', async () => {
        const res = await como(superAdmin)('post', '/api/usuarios').send({
            nome: 'Root 2', email: 'root2@x.com', senha: '123456', tipo: 'SUPER_ADMIN',
        });

        expect(res.status).toBe(201);
        const criado = await Usuario.findOne({ email: 'root2@x.com' });
        expect(criado.tipo).toBe('SUPER_ADMIN');
        // Perfil global: não ganha vínculo de escola.
        expect(criado.vinculos).toHaveLength(0);
    });
});

describe('SUPER_ADMIN é superconjunto do ADMIN', () => {
    // Rotas restritas a autorizar('ADMIN'): o SUPER_ADMIN passa em todas, sem
    // estar vinculado a escola nenhuma.
    const rotasDeAdmin = [
        ['get', '/api/usuarios'],
        ['get', '/api/usuarios/estatisticas'],
        ['get', '/api/gincanas'],
    ];

    it.each(rotasDeAdmin)('SUPER_ADMIN passa em %s %s sem vínculo', async (metodo, url) => {
        const res = await como(superAdmin)(metodo, url);

        expect(res.status).toBeLessThan(400);
    });

    it('SUPER_ADMIN cria gincana em qualquer escola, sem vínculo', async () => {
        for (const escola of [ESCOLA_A, ESCOLA_B]) {
            const res = await como(superAdmin, { escola })('post', '/api/gincanas')
                .send({ nome: `Nova de ${escola}`, ano: ANO });

            expect(res.status).toBe(201);
        }

        expect(await Gincana.countDocuments({ escola_id: ESCOLA_B })).toBe(1);
    });

    it('SUPER_ADMIN cria escola; o ADMIN dela continua sem esse poder', async () => {
        const criada = await como(superAdmin)('post', '/api/escolas').send({ nome: 'Escola C' });
        expect(criada.status).toBe(201);

        const escolaC = (await Escola.findOne({ nome: 'Escola C' }))._id;

        // Vincula o ADMIN da A também à C (ADMIN é perfil multi-escola).
        const vinculo = await como(superAdmin)('post', `/api/escolas/${escolaC}/usuarios`)
            .send({ email: adminA.email, tipo: 'ADMIN' });
        expect(vinculo.status).toBeLessThan(400);

        // Ele administra a C de verdade...
        const gincana = await como(adminA, { escola: escolaC })('post', '/api/gincanas')
            .send({ nome: 'Gincana da C', ano: ANO });
        expect(gincana.status).toBe(201);

        // ...mas continua sem criar escolas.
        const tentativa = await como(adminA, { escola: escolaC })('post', '/api/escolas')
            .send({ nome: 'Escola D' });
        expect(tentativa.status).toBe(403);
    });

    it('a listagem de usuários é sempre a da escola ativa, inclusive para o SUPER_ADMIN', async () => {
        await Usuario.create({
            nome: 'Aluno B', email: 'aluno.b@x.com', senha: '123456', tipo: 'ALUNO',
            vinculos: [{ escola_id: ESCOLA_B, tipo: 'ALUNO', turma: 'EF - 7º Ano' }],
        });

        const doAdmin = await como(adminA)('get', '/api/usuarios');
        expect(doAdmin.status).toBe(200);
        expect(JSON.stringify(doAdmin.body)).toContain('aluno.a@x.com');
        expect(JSON.stringify(doAdmin.body)).not.toContain('aluno.b@x.com');

        // O SUPER_ADMIN vê tudo, mas uma escola de cada vez (a do header).
        const rootNaB = await como(superAdmin, { escola: ESCOLA_B })('get', '/api/usuarios');
        expect(rootNaB.status).toBe(200);
        expect(JSON.stringify(rootNaB.body)).toContain('aluno.b@x.com');
        expect(JSON.stringify(rootNaB.body)).not.toContain('aluno.a@x.com');
    });
});

describe('bordas do vínculo e do escopo', () => {
    it('ADMIN com vínculo SUSPENSO perde o acesso mesmo com token válido', async () => {
        await Usuario.updateOne(
            { _id: adminA._id, 'vinculos.escola_id': ESCOLA_A },
            { $set: { 'vinculos.$.status': 'SUSPENSO' } },
        );

        const res = await como(adminA)('get', '/api/usuarios');

        expect(res.status).toBe(403);
        expect(res.body.codigo).toBe('VINCULO_INATIVO');
    });

    it('perder o vínculo invalida o acesso sem precisar de novo login', async () => {
        await Usuario.updateOne({ _id: adminA._id }, { $set: { vinculos: [] } });

        const res = await como(adminA)('get', '/api/gincanas');

        expect(res.status).toBe(403);
        expect(res.body.codigo).toBe('SEM_VINCULO_ESCOLA');
    });

    it('ADMIN não alcança gincana de outra escola trocando o X-Gincana-Id', async () => {
        const gincanaB = await Gincana.create({
            _id: 'GINCANA_B', escola_id: ESCOLA_B, nome: 'Gincana B', ano: ANO,
            criado_por: new mongoose.Types.ObjectId(),
        });

        const res = await como(adminA, { escola: ESCOLA_A, gincana: gincanaB._id })(
            'put', `/api/gincanas/${gincanaB._id}`,
        ).send({ nome: 'Sequestrada' });

        expect(res.status).toBe(404);
        expect((await Gincana.findById('GINCANA_B')).nome).toBe('Gincana B');
    });

    // Regressão: omitir o X-Escola-Id era um bypass de autorização quando a
    // escola legada ESCOLA_PRINCIPAL não estava no banco (instalação que não
    // rodou `npm run seed:escola`). O ramo de compatibilidade chamava next()
    // SEM checar vínculo e SEM sobrescrever req.usuario.tipo, então valia o
    // `tipo` BASE do token: quem é ALUNO na escola A mas tem base ADMIN tomava
    // 403 com o header e 200 sem ele — e criava usuários ADMIN no escopo legado.
    it('sem X-Escola-Id o papel base do token não vale sozinho', async () => {
        const rebaixado = await Usuario.create({
            nome: 'Ex-admin', email: 'ex.admin@x.com', senha: '123456', tipo: 'ADMIN',
            vinculos: [{ escola_id: ESCOLA_A, tipo: 'ALUNO', turma: 'EF - 6º Ano' }],
        });

        const comHeader = await como(rebaixado)('get', '/api/usuarios');
        expect(comHeader.status).toBe(403); // papel da escola = ALUNO

        const semHeader = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${tokenDe(rebaixado)}`);

        expect(semHeader.status).toBe(400);
        expect(semHeader.body.codigo).toBe('ESCOLA_NAO_SELECIONADA');
    });

    it('sem X-Escola-Id ninguém cria usuário no escopo legado', async () => {
        const res = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${tokenDe(adminA)}`)
            .send({ nome: 'Fantasma', email: 'fantasma@x.com', senha: '123456', tipo: 'ADMIN' });

        expect(res.status).toBe(400);
        expect(await Usuario.findOne({ email: 'fantasma@x.com' })).toBeNull();
    });

    it('requisição sem token é 401, não 403', async () => {
        const res = await request(app).get('/api/escolas').set('X-Escola-Id', ESCOLA_A);
        expect(res.status).toBe(401);
    });

    it('token assinado com outro segredo é rejeitado', async () => {
        const forjado = jwt.sign(
            { id: adminA._id.toString(), nome: 'Admin A', tipo: 'SUPER_ADMIN' },
            'segredo-errado',
            { expiresIn: '2h' },
        );

        const res = await request(app)
            .post('/api/escolas')
            .set('Authorization', `Bearer ${forjado}`)
            .send({ nome: 'Escola Forjada' });

        expect(res.status).toBe(401);
        expect(await Escola.countDocuments()).toBe(2);
    });

    it('/escolas/minhas devolve só as escolas do próprio usuário', async () => {
        const res = await como(adminA)('get', '/api/escolas/minhas');

        expect(res.status).toBe(200);
        expect(res.body.map((e) => e._id)).toEqual([ESCOLA_A]);
    });

});

describe('token defasado: papel base que mudou depois do login', () => {
    // Regressão: `autorizar('SUPER_ADMIN')` lê req.usuario.tipo, que em
    // escolaRoutes vinha direto do JWT — o router não tem resolverEscola, e
    // mesmo se tivesse ele dava next() de imediato quando o TOKEN dizia
    // SUPER_ADMIN, sem reler o banco. Como o token vale 2h, quem fosse
    // rebaixado seguia criando escolas e mexendo em vínculos até ele expirar.
    it('rebaixado de SUPER_ADMIN para ADMIN não mantém o poder global', async () => {
        // O usuário logou como SUPER_ADMIN (o token diz SUPER_ADMIN) e depois
        // foi rebaixado no banco. O token velho ainda vale por 2h.
        const token = tokenDe(superAdmin);

        await Usuario.updateOne(
            { _id: superAdmin._id },
            { $set: { tipo: 'ADMIN', vinculos: [{ escola_id: ESCOLA_A, tipo: 'ADMIN' }] } },
        );

        const res = await request(app)
            .post('/api/escolas')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Escola-Id', ESCOLA_A)
            .send({ nome: 'Escola Fantasma' });

        expect(res.status).toBe(403);
        expect(await Escola.findOne({ nome: 'Escola Fantasma' })).toBeNull();
    });
});
