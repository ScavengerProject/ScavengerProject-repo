import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Usuario, { podeMultiEscola, PERFIS_MULTI_ESCOLA } from '../models/Usuario.js';
import { getGincanaIdsDoUsuario } from '../gincanas/gincanaHelpers.js';

dotenv.config();

/**
 * Migra o papel do usuário de GLOBAL para POR ESCOLA.
 *
 * Antes: `Usuario.escolas: [escola_id]` + `Usuario.tipo` único — o mesmo papel
 * valia em todas as escolas, então mudar o perfil de alguém numa escola mudava
 * também nas outras.
 *
 * Depois: `Usuario.vinculos: [{ escola_id, tipo, turma, status }]`, um papel
 * independente por escola. Esta migração cria um vínculo para cada escola que
 * já estava em `escolas`, herdando o papel/turma/status atuais do usuário —
 * ou seja, ninguém muda de perfil por causa da migração.
 *
 * O campo legado `escolas` é removido ao final.
 *
 * Escola única: perfis de participante (ALUNO, COORDENADOR, PROFESSOR, PAI/MÃE)
 * pertencem a exatamente uma escola — só os de `PERFIS_MULTI_ESCOLA` (ADMIN)
 * acumulam. Quem estava em várias escolas legadas fica na escola onde de fato
 * participa (a da sua equipe/gincana) e, na falta desse sinal, na primeira da
 * lista. As escolas descartadas são impressas no final para conferência.
 *
 * Script idempotente: pode ser executado mais de uma vez com segurança.
 * Uso: `npm run migrar:papeis` (dentro de server/)
 *
 * Ordem recomendada: rode DEPOIS do seedEscolaPrincipal.js.
 */
const migrarPapeisPorEscola = async () => {
    await connectDB();

    try {
        // Lê pelo driver puro: `escolas` não existe mais no schema, então o
        // Mongoose não o traria em um find() normal.
        const colecao = mongoose.connection.collection('Usuarios');
        const usuarios = await colecao.find({}).toArray();

        let criados = 0;
        let jaMigrados = 0;
        let semEscola = 0;
        const descartados = [];

        // Escolas em que o usuário realmente participa de alguma gincana. É o
        // desempate certo para quem estava em mais de uma escola legada: manter
        // a escola da equipe dele, e não a primeira que aparecer na lista.
        const escolasComParticipacao = async (doc) => {
            const gincanaIds = await getGincanaIdsDoUsuario(doc._id);
            if (gincanaIds.length === 0) return [];
            const gincanas = await mongoose.connection
                .collection('Gincanas')
                .find({ _id: { $in: gincanaIds } })
                .project({ escola_id: 1 })
                .toArray();
            return gincanas.map((g) => String(g.escola_id));
        };

        for (const doc of usuarios) {
            const vinculosExistentes = doc.vinculos || [];
            const jaTem = new Set(vinculosExistentes.map((v) => String(v.escola_id)));

            let escolasLegadas = (doc.escolas || []).map(String);

            if (escolasLegadas.length === 0 && vinculosExistentes.length === 0) {
                // SUPER_ADMIN sem vínculo é esperado (ele acessa todas). Os demais
                // ficam sem acesso e precisam ser vinculados pela interface.
                if (doc.tipo !== 'SUPER_ADMIN') semEscola += 1;
                continue;
            }

            // SUPER_ADMIN é global; guarda ADMIN no vínculo só para o caso de
            // ele ser rebaixado depois.
            const tipoDoVinculo = doc.tipo === 'SUPER_ADMIN' ? 'ADMIN' : doc.tipo;

            // Perfil de escola única em várias escolas legadas: mantém uma só.
            if (!podeMultiEscola(tipoDoVinculo) && escolasLegadas.length + jaTem.size > 1) {
                const participa = await escolasComParticipacao(doc);
                const candidatas = [...jaTem, ...escolasLegadas];
                const escolhida = candidatas.find((e) => participa.includes(e)) || candidatas[0];

                descartados.push({
                    email: doc.email,
                    tipo: tipoDoVinculo,
                    mantida: escolhida,
                    removidas: candidatas.filter((e) => e !== escolhida),
                });

                // Descarta os vínculos já criados que não sejam o escolhido...
                if (jaTem.size > 0 && !(jaTem.size === 1 && jaTem.has(escolhida))) {
                    await colecao.updateOne(
                        { _id: doc._id },
                        { $pull: { vinculos: { escola_id: { $ne: escolhida } } } }
                    );
                    jaTem.clear();
                    if (vinculosExistentes.some((v) => String(v.escola_id) === escolhida)) {
                        jaTem.add(escolhida);
                    }
                }

                // ...e considera apenas a escola escolhida entre as legadas.
                escolasLegadas = escolasLegadas.filter((e) => e === escolhida);
            }

            const novos = escolasLegadas
                .filter((escolaId) => !jaTem.has(escolaId))
                .map((escolaId) => ({
                    escola_id: escolaId,
                    tipo: tipoDoVinculo,
                    turma: doc.turma ?? null,
                    status: doc.status || 'ATIVO',
                    criado_em: doc.criado_em || new Date(),
                }));

            if (novos.length === 0) {
                jaMigrados += 1;
            } else {
                await colecao.updateOne(
                    { _id: doc._id },
                    { $push: { vinculos: { $each: novos } } }
                );
                criados += novos.length;
            }
        }

        console.log(`Vínculos criados: ${criados}.`);
        console.log(`Usuários que já estavam migrados: ${jaMigrados}.`);
        if (semEscola > 0) {
            console.warn(`AVISO: ${semEscola} usuário(s) sem nenhuma escola. Vincule-os pela tela de Escolas.`);
        }

        if (descartados.length > 0) {
            console.warn(
                `
AVISO: ${descartados.length} usuário(s) com perfil de escola única estavam em mais de uma escola. ` +
                `Só ${PERFIS_MULTI_ESCOLA.join('/')} pode(m) acumular escolas, então cada um ficou em apenas uma:`
            );
            descartados.forEach((d) => {
                console.warn(`  - ${d.email} (${d.tipo}): mantido em '${d.mantida}', removido de ${d.removidas.map((e) => `'${e}'`).join(', ')}.`);
            });
        }

        // Remove o campo legado só depois que os vínculos existem.
        const limpeza = await colecao.updateMany(
            { escolas: { $exists: true } },
            { $unset: { escolas: '' } }
        );
        console.log(`Campo legado 'escolas' removido de ${limpeza.modifiedCount} usuário(s).`);

        await Usuario.syncIndexes();
        console.log("Índices sincronizados (agora em 'vinculos.escola_id').");
    } catch (error) {
        console.error('Erro ao migrar papéis por escola:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

migrarPapeisPorEscola();
