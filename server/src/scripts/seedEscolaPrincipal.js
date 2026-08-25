import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Usuario from '../models/Usuario.js';
import Escola from '../models/Escola.js';
import Gincana from '../models/Gincana.js';
import { aplicarVinculo } from '../escolas/escolaHelpers.js';

dotenv.config();

/**
 * Cria a Escola "legada" que representa todos os dados anteriores ao
 * multi-escola. Ela recebe o _id String fixo 'ESCOLA_PRINCIPAL', que é o mesmo
 * default do campo `escola_id` em Gincana — assim as gincanas existentes já
 * apontam para ela sem update em massa.
 *
 * Também:
 *  - vincula TODOS os usuários existentes a essa escola (Usuario.vinculos),
 *    herdando o papel/turma atuais de cada um;
 *  - materializa `escola_id` nas gincanas antigas que não tenham o campo;
 *  - promove o primeiro ADMIN a SUPER_ADMIN, se ainda não houver nenhum
 *    (sem isso ninguém conseguiria cadastrar a segunda escola).
 *
 * Script idempotente: pode ser executado mais de uma vez com segurança.
 * Uso: `node server/src/scripts/seedEscolaPrincipal.js`
 *
 * Ordem recomendada na migração:
 *   1) seedAdmin.js  2) seedGincanaPrincipal.js  3) seedEscolaPrincipal.js
 *   4) migrarPapeisPorEscola.js (papel por escola)
 */
const ESCOLA_PRINCIPAL_ID = 'ESCOLA_PRINCIPAL';

const seedEscolaPrincipal = async () => {
    await connectDB();

    try {
        // 1. Precisa de um usuário para o campo `criado_por`.
        const admin = await Usuario.findOne({ tipo: { $in: ['SUPER_ADMIN', 'ADMIN'] } });
        if (!admin) {
            console.error('ERRO: Nenhum ADMIN encontrado. Rode o seedAdmin.js antes.');
            return;
        }

        // 2. Cria a Escola legada (se ainda não existir), com _id String fixo.
        const jaExiste = await Escola.findById(ESCOLA_PRINCIPAL_ID);
        if (jaExiste) {
            console.log('Escola Principal já existe.');
        } else {
            await new Escola({
                _id: ESCOLA_PRINCIPAL_ID,
                nome: 'Escola Principal',
                status: 'ATIVA',
                criado_por: admin._id,
            }).save();
            console.log(`Escola Principal criada com _id='${ESCOLA_PRINCIPAL_ID}'.`);
        }

        // 3. Materializa escola_id nas Gincanas antigas que ainda não têm o campo.
        const resGincana = await Gincana.updateMany(
            { escola_id: { $exists: false } },
            { $set: { escola_id: ESCOLA_PRINCIPAL_ID } }
        );
        console.log(`Gincanas atualizadas com escola_id legado: ${resGincana.modifiedCount}.`);

        // 4. Vincula todos os usuários existentes à escola legada, herdando o
        //    papel atual de cada um. O filtro por 'vinculos.escola_id' torna a
        //    operação idempotente (não duplica o vínculo em reexecuções).
        const semVinculo = await Usuario.find({ 'vinculos.escola_id': { $ne: ESCOLA_PRINCIPAL_ID } });
        for (const usuario of semVinculo) {
            aplicarVinculo(usuario, ESCOLA_PRINCIPAL_ID);
            await usuario.save();
        }
        console.log(`Usuários vinculados à Escola Principal: ${semVinculo.length}.`);

        // 5. Garante que exista um SUPER_ADMIN — sem ele não há como cadastrar
        //    a segunda escola pela interface.
        const superAdmin = await Usuario.findOne({ tipo: 'SUPER_ADMIN' });
        if (superAdmin) {
            console.log(`SUPER_ADMIN já existe: ${superAdmin.email}.`);
        } else {
            const primeiroAdmin = await Usuario.findOne({ tipo: 'ADMIN' }).sort({ criado_em: 1 });
            if (primeiroAdmin) {
                primeiroAdmin.tipo = 'SUPER_ADMIN';
                await primeiroAdmin.save();
                console.log(`Promovido a SUPER_ADMIN: ${primeiroAdmin.email}.`);
            } else {
                console.warn('AVISO: nenhum ADMIN para promover a SUPER_ADMIN.');
            }
        }

        // 6. Sincroniza índices: o unique de Gincana passou de {nome, ano} para
        //    {escola_id, nome, ano}, permitindo o mesmo nome em escolas diferentes.
        await Escola.syncIndexes();
        await Gincana.syncIndexes();
        await Usuario.syncIndexes();
        console.log('Índices sincronizados (unique de Gincana agora inclui escola_id).');
    } catch (error) {
        console.error('Erro ao criar a Escola Principal:', error.message);
    } finally {
        await mongoose.connection.close();
    }
};

seedEscolaPrincipal();
