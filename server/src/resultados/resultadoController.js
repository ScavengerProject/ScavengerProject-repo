import Resultado from '../models/Resultado.js';
import Prova from '../models/Prova.js';
import EquipeGincana from '../models/EquipeGincana.js';
import Equipe from '../models/Equipe.js';
import mongoose from 'mongoose';
import { calcularStatusProva } from '../provas/provaController.js';

/**
 * [GET] Lista os resultados de uma prova específica
 */
export const listarResultadosDaProva = async (req, res) => {
  try {
    const { provaId } = req.query;
    if (!provaId) {
      return res.status(400).json({ message: 'O ID da prova (provaId) é obrigatório' });
    }


    // 1. Busca os resultados E a prova em paralelo
    const [resultados, prova] = await Promise.all([
      Resultado.find({ prova_id: provaId })
        .sort({ pontuacao_obtida: -1 })
        .populate('equipe_id', 'nome cor'),
      Prova.findById(provaId).select('pontuacao') // Busca as regras de pontuação
    ]);

    // Verificar se há resultados com IDs de EquipeGincana (erro antigo) e corrigir
    const resultadosParaCorrigir = [];
    for (const resultado of resultados) {
      // Se o populate falhou (equipe_id é null ou não foi populado)
      if (!resultado.equipe_id || (typeof resultado.equipe_id === 'object' && !resultado.equipe_id._id && !resultado.equipe_id.nome)) {
        // Tentar buscar o equipe_id original (antes do populate)
        const equipeIdOriginal = resultado.equipe_id?._id || resultado.equipe_id;
        if (equipeIdOriginal) {
          try {
            // Verificar se é um ID de EquipeGincana
            const equipeGincana = await EquipeGincana.findById(equipeIdOriginal);
            if (equipeGincana && equipeGincana.equipe_id) {
              resultado.equipe_id = equipeGincana.equipe_id;
              resultadosParaCorrigir.push(resultado);
            } else {
              // Verificar se é um ID de Equipe válido mas a equipe foi deletada
              const equipe = await Equipe.findById(equipeIdOriginal);
              if (!equipe) {
                console.warn(`⚠️ Resultado ${resultado._id} referencia equipe que não existe mais: ${equipeIdOriginal}`);
              }
            }
          } catch (error) {
            // Ignorar erros de conversão
            console.warn(`⚠️ Erro ao verificar equipe do resultado ${resultado._id}:`, error.message);
          }
        }
      }
    }

    // Salvar correções se houver
    if (resultadosParaCorrigir.length > 0) {
      await Promise.all(resultadosParaCorrigir.map(r => r.save()));

      // Recarregar resultados após correção
      const resultadosCorrigidos = await Resultado.find({ prova_id: provaId })
        .sort({ pontuacao_obtida: -1 })
        .populate('equipe_id', 'nome cor');
      resultados.length = 0;
      resultados.push(...resultadosCorrigidos);
    }

    if (!prova) {
      return res.status(404).json({ message: 'Prova não encontrada.' });
    }

    // 2. Determina o tipo de pontuação (para saber como extrair o 'valor')
    const regras = prova.pontuacao || {};
    const tipo = regras.pontos_por_unidade ? 'PROPORCIONAL' : 'RANKING';

    // 3. Formata a resposta, incluindo o 'valor' original
    const resultadosFormatados = resultados.map((r, index) => {
      // Verifica se a equipe foi populada corretamente
      if (!r.equipe_id) {
        console.warn(`⚠️ Resultado ${r._id} tem equipe_id inválida ou null`);
        console.warn(`⚠️ equipe_id raw:`, r.equipe_id);
        return null;
      }

      // Se equipe_id não foi populado (é ObjectId, não objeto), tentar buscar
      let equipeInfo = null;
      if (typeof r.equipe_id === 'object' && r.equipe_id._id) {
        // Foi populado corretamente
        equipeInfo = r.equipe_id;
      } else {
        // Não foi populado, pode ser que a equipe não existe mais
        console.warn(`⚠️ Equipe não populada para resultado ${r._id}, equipe_id:`, r.equipe_id);
        return null;
      }

      let valor;

      // Extrai o input original do texto 'detalhes_pontuacao'
      if (tipo === 'RANKING') {
        // Ex: "1ª Posição" -> extrai "1"
        valor = r.detalhes_pontuacao.match(/^(\d+)/)?.[1] || '';
      } else {
        // Ex: "50 doações" -> extrai "50"
        valor = r.detalhes_pontuacao.match(/^(\d+)/)?.[1] || '';
      }

      return {
        posicao: index + 1,
        equipe_id: equipeInfo._id,
        equipe_nome: equipeInfo.nome || 'Equipe Desconhecida',
        equipe_cor: equipeInfo.cor || '#000000',
        pontos_obtidos: r.pontuacao_obtida,
        detalhes: r.detalhes_pontuacao,
        valor: valor,
      };
    }).filter(r => r !== null); // Remove resultados com equipes inválidas

    res.status(200).json(resultadosFormatados);

  } catch (error) {
    console.error('Erro ao listar resultados da prova:', error);
    res.status(500).json({ message: 'Erro interno ao buscar resultados.' });
  }
};

/**
 * [POST] Lança ou atualiza os resultados de uma prova
 */
export const lancarResultados = async (req, res) => {
  const { provaId } = req.query;
  if (!provaId) {
    return res.status(400).json({ message: 'O ID da prova (provaId) é obrigatório.' });
  }

  const { tipo, resultados } = req.body;

  if (!tipo || !resultados || !Array.isArray(resultados)) {
    return res.status(400).json({ message: 'Dados inválidos: tipo e resultados são obrigatórios.' });
  }

  const avaliadorId = req.usuario.id;
  const gincanaId = 'GINCANA_PRINCIPAL';

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const prova = await Prova.findById(provaId).session(session);
    if (!prova) throw new Error('Prova não encontrada.');
    // Status derivado das datas (a prova só fica "CONCLUIDA" após a data de término).
    if (calcularStatusProva(prova.data_inicio, prova.data_fim) !== 'CONCLUIDA') {
      throw new Error('A prova precisa estar "CONCLUIDA"');
    }
    const regrasPontuacao = prova.pontuacao || {};

    // Extrair configuração dos quesitos da prova
    const quesitosMarcados = prova.quesitos_de_avaliacao || [];

    const resultadosAntigos = await Resultado.find({ prova_id: provaId }).session(session);
    if (resultadosAntigos.length > 0) {
      const updatesReversao = resultadosAntigos.map(r => {
        const equipeObjId = new mongoose.Types.ObjectId(r.equipe_id);
        return {
          updateOne: {
            filter: { equipe_id: equipeObjId, gincana_id: gincanaId },
            update: { $inc: { pontos_acumulados: -r.pontuacao_obtida } }
          }
        }
      });
      await EquipeGincana.bulkWrite(updatesReversao, { session });
    }

    // 2. Deletar todos os resultados antigos
    await Resultado.deleteMany({ prova_id: provaId }).session(session);

    // 3. Preparar novos resultados e atualizações de pontos
    const novosResultadosDocs = [];
    const updatesPontuacao = [];

    // Validar todos os equipe_ids antes de processar
    const equipeIds = resultados.map(r => r.equipe_id).filter(Boolean);

    // Converter para ObjectId
    const equipeObjectIds = equipeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error('❌ ERRO ao converter ID para ObjectId:', id, error);
        return null;
      }
    }).filter(Boolean);

    const equipesExistentes = await Equipe.find({ _id: { $in: equipeObjectIds } }).select('_id nome').session(session);
    const equipesExistentesMap = new Map(equipesExistentes.map(eq => [eq._id.toString(), eq]));

    // Se não encontrou todas, listar quais estão faltando
    const idsNaoEncontrados = equipeIds.filter(id => {
      try {
        const objId = new mongoose.Types.ObjectId(id);
        return !equipesExistentesMap.has(objId.toString());
      } catch {
        return true;
      }
    });

    if (idsNaoEncontrados.length > 0) {
      console.error('❌ ERRO - Equipes não encontradas na coleção Equipe:', idsNaoEncontrados);
      // Tentar verificar se são IDs de EquipeGincana
      try {
        const equipeGincanaObjectIds = idsNaoEncontrados.map(id => new mongoose.Types.ObjectId(id));
        const equipesGincana = await EquipeGincana.find({ _id: { $in: equipeGincanaObjectIds } }).select('_id equipe_id').session(session);
        if (equipesGincana.length > 0) {
          console.error('⚠️ ATENÇÃO: Os IDs enviados são de EquipeGincana, não de Equipe!');
          console.error('⚠️ IDs de EquipeGincana encontrados:', equipesGincana.map(eg => ({
            equipeGincana_id: eg._id.toString(),
            equipe_id: eg.equipe_id?.toString()
          })));
          throw new Error(`Os IDs enviados são de EquipeGincana (${equipesGincana[0]._id}), mas o sistema espera IDs de Equipe (${equipesGincana[0].equipe_id}). Verifique o endpoint listarEquipesGincana().`);
        }
      } catch (error) {
        if (error.message.includes('EquipeGincana')) {
          throw error;
        }
        console.error('Erro ao verificar EquipeGincana:', error);
      }
    }

    for (const res of resultados) {
      if (!res.equipe_id || !res.valor) {
        throw new Error(`Dados incompletos para resultado: equipe_id e valor são obrigatórios`);
      }

      let pontuacao_base = 0;
      let pontuacao_quesitos = 0;
      let detalhes_pontuacao = "";

      try {
        var equipeObjId = new mongoose.Types.ObjectId(res.equipe_id);
      } catch (error) {
        console.error('❌ Erro ao converter equipe_id para ObjectId:', res.equipe_id, error);
        throw new Error(`ID de equipe inválido: ${res.equipe_id}`);
      }

      // Validar se a equipe existe
      const equipeExiste = equipesExistentesMap.get(res.equipe_id);
      if (!equipeExiste) {
        console.error('❌ ERRO: Equipe não encontrada no banco de dados:', res.equipe_id);
        throw new Error(`Equipe com ID ${res.equipe_id} não existe no banco de dados. Verifique se a equipe foi deletada ou se o ID está correto.`);
      }

      // Calcular pontuação base
      if (tipo === 'RANKING') {
        const posicao = res.valor;
        pontuacao_base = Number(regrasPontuacao[posicao]) || 0;
        detalhes_pontuacao = `${posicao}ª Posição`;
      }
      else if (tipo === 'PROPORCIONAL') {
        const quantidade = Number(res.valor) || 0;
        const pontosPorUnidade = Number(regrasPontuacao.pontos_por_unidade) || 0;
        pontuacao_base = quantidade * pontosPorUnidade;
        detalhes_pontuacao = `${quantidade} ${regrasPontuacao.nome_unidade || 'unidades'}`;

        const limitePorcoes = Number(regrasPontuacao.limite_pontuacao_porcoes) || 0;
        if (limitePorcoes > 0 && pontuacao_base > limitePorcoes) {
          pontuacao_base = limitePorcoes;
          detalhes_pontuacao = `${quantidade} ${regrasPontuacao.nome_unidade || 'unidades'} (teto atingido: ${limitePorcoes} pts)`;
        }
      }

      // Calcular pontuação dos quesitos
      const quesitosEquipe = res.quesitos || {};
      if (quesitosMarcados.includes('TEMPO') && quesitosEquipe.TEMPO) {
        pontuacao_quesitos += Number(quesitosEquipe.TEMPO) || 0;
        detalhes_pontuacao += ` + Quesito Tempo (${quesitosEquipe.TEMPO}pts)`;
      }
      if (quesitosMarcados.includes('PRODUTIVIDADE') && quesitosEquipe.PRODUTIVIDADE) {
        pontuacao_quesitos += Number(quesitosEquipe.PRODUTIVIDADE) || 0;
        detalhes_pontuacao += ` + Quesito Produtividade (${quesitosEquipe.PRODUTIVIDADE}pts)`;
      }

      const pontuacao_total = pontuacao_base + pontuacao_quesitos;

      // TEMPORÁRIO: Sempre salvar resultados para debug
      if (true) {
        novosResultadosDocs.push({
          gincana_id: gincanaId,
          prova_id: provaId,
          equipe_id: equipeObjId,
          pontuacao_obtida: pontuacao_total,
          detalhes_pontuacao: detalhes_pontuacao,
          avaliado_por_usuario_id: avaliadorId,
          submetido_em: new Date(),
        });
      }

      // TEMPORÁRIO: Sempre atualizar pontos para debug
      updatesPontuacao.push({
        updateOne: {
          filter: { equipe_id: equipeObjId, gincana_id: gincanaId },
          update: { $inc: { pontos_acumulados: pontuacao_total } }
        }
      });
    }

    // 4. Inserir novos resultados e aplicar novos pontos
    if (novosResultadosDocs.length > 0) {
      const resultadosInseridos = await Resultado.insertMany(novosResultadosDocs, { session });
    }
    if (updatesPontuacao.length > 0) {
      const resultadoBulk = await EquipeGincana.bulkWrite(updatesPontuacao, { session });
    }

    // 5. Lançar os resultados
    await session.commitTransaction();
    res.status(201).json({ message: 'Resultados lançados com sucesso!' });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ ERRO ao lançar resultados:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      message: error.message || 'Erro interno ao salvar resultados.',
      details: error.stack
    });
  } finally {
    session.endSession();
  }
};