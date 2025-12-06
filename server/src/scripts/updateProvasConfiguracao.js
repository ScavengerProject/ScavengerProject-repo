import mongoose from 'mongoose';
import Prova from '../models/Prova.js';
import { db } from '../config/db.js';

/**
 * Script para atualizar provas existentes que não têm o campo configuracao_quesitos
 */
const updateProvasConfiguracao = async () => {
  try {
    await db();

    console.log('🔄 Atualizando provas existentes...');

    // Buscar todas as provas
    const todasProvas = await Prova.find({});
    console.log(`Encontradas ${todasProvas.length} provas no total`);

    let atualizadas = 0;

    for (const prova of todasProvas) {
      let precisaAtualizar = false;

      // Se não tem configuracao_quesitos, inicializar
      if (!prova.configuracao_quesitos) {
        prova.configuracao_quesitos = {};
        precisaAtualizar = true;
      }

      // Se tem quesitos marcados mas não tem configuração, criar configuração básica vazia
      if (prova.quesitos_de_avaliacao && Array.isArray(prova.quesitos_de_avaliacao)) {
        if (prova.quesitos_de_avaliacao.includes('TEMPO') && !prova.configuracao_quesitos.TEMPO) {
          prova.configuracao_quesitos.TEMPO = {};
          precisaAtualizar = true;
        }
        if (prova.quesitos_de_avaliacao.includes('PRODUTIVIDADE') && !prova.configuracao_quesitos.PRODUTIVIDADE) {
          prova.configuracao_quesitos.PRODUTIVIDADE = {};
          precisaAtualizar = true;
        }
      }

      if (precisaAtualizar) {
        await prova.save();
        atualizadas++;
        console.log(`✅ Atualizada prova: ${prova.titulo} (quesitos: ${prova.quesitos_de_avaliacao?.join(', ') || 'nenhum'})`);
      }
    }

    console.log(`🎉 Atualização concluída! ${atualizadas} provas atualizadas.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao atualizar provas:', error);
    process.exit(1);
  }
};

updateProvasConfiguracao();
