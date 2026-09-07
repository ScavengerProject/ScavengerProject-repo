import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Usuario from '../models/Usuario.js';
import Gincana from '../models/Gincana.js';
import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';

dotenv.config();

/**
 * Cria a Gincana "legada" que representa todos os dados anteriores ao
 * multi-gincana. Ela recebe o _id String fixo 'GINCANA_PRINCIPAL' para que os
 * documentos existentes (cujo campo gincana_id já vale 'GINCANA_PRINCIPAL')
 * continuem apontando para ela sem NENHUM update em massa.
 *
 * Script idempotente: pode ser executado mais de uma vez com segurança.
 * Uso: `node server/src/scripts/seedGincanaPrincipal.js`
 */
const GINCANA_PRINCIPAL_ID = 'GINCANA_PRINCIPAL';

const seedGincanaPrincipal = async () => {
    await connectDB();

    try {
        // 1. Cria a Gincana legada (se ainda não existir), com _id String fixo.
        const jaExiste = await Gincana.findById(GINCANA_PRINCIPAL_ID);
        if (jaExiste) {
            console.log('Gincana Principal já existe.');
        } else {
            const admin = await Usuario.findOne({ tipo: 'ADMIN' });
            if (!admin) {
                console.error('ERRO: Nenhum ADMIN encontrado. Rode o seedAdmin.js antes.');
                return;
            }

            await new Gincana({
                _id: GINCANA_PRINCIPAL_ID,
                nome: 'Gincana Principal',
                ano: new Date().getFullYear(),
                status: 'ATIVA',
                descricao: 'Gincana criada automaticamente a partir dos dados existentes.',
                criado_por: admin._id,
            }).save();
            console.log(`Gincana Principal criada com _id='${GINCANA_PRINCIPAL_ID}'.`);
        }

        // 2. Materializa gincana_id nas Equipes antigas que ainda não têm o campo
        //    (o multi-gincana passou a exigi-lo). Aponta para a gincana legada.
        const resEquipe = await Equipe.updateMany(
            { gincana_id: { $exists: false } },
            { $set: { gincana_id: GINCANA_PRINCIPAL_ID } }
        );
        console.log(`Equipes atualizadas com gincana_id legado: ${resEquipe.modifiedCount}.`);

        // 3. Sincroniza os índices: derruba os unique globais antigos
        //    (Equipe.nome, EquipeGincana.equipe_id) e cria os compostos com gincana_id.
        await Equipe.syncIndexes();
        await EquipeGincana.syncIndexes();
        await Gincana.syncIndexes();
        console.log('Índices sincronizados (compostos com gincana_id).');
    } catch (error) {
        console.error('Erro ao criar a Gincana Principal:', error.message);
    } finally {
        await mongoose.connection.close();
    }
};

seedGincanaPrincipal();
