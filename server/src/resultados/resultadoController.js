import Resultado from '../models/Resultado.js';
import Prova from '../models/Prova.js';
import EquipeGincana from '../models/EquipeGincana.js';
import mongoose from 'mongoose';

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

    if (!resultados) {
      return res.status(404).json({ message: 'Resultados não encontrados para esta prova.' });
    }

    // 2. Determina o tipo de pontuação (para saber como extrair o 'valor')
    const regras = prova.pontuacao || {};
    const tipo = regras.pontos_por_unidade ? 'PROPORCIONAL' : 'RANKING';

    // 3. Formata a resposta, incluindo o 'valor' original
    const resultadosFormatados = resultados.map((r, index) => {
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
        equipe_id: r.equipe_id._id,
        equipe_nome: r.equipe_id.nome,
        equipe_cor: r.equipe_id.cor,
        pontos_obtidos: r.pontuacao_obtida,
        detalhes: r.detalhes_pontuacao,
        valor: valor,
      };
    });

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
  const avaliadorId = req.usuario.id;
  const gincanaId = 'GINCANA_PRINCIPAL'; 

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const prova = await Prova.findById(provaId).session(session);
    if (!prova) throw new Error('Prova não encontrada.');
    if (prova.status !== 'CONCLUIDA') throw new Error('A prova precisa estar "CONCLUIDA"');
    const regrasPontuacao = prova.pontuacao || {};

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

    for (const res of resultados) {
      let pontuacao_obtida = 0;
      let detalhes_pontuacao = "";

      console.log('ID DA EQUIPE RECEBIDO DO FRONTEND:', res.equipe_id);
      
      const equipeObjId = new mongoose.Types.ObjectId(res.equipe_id);

      if (tipo === 'RANKING') {
        const posicao = res.valor;
        pontuacao_obtida = Number(regrasPontuacao[posicao]) || 0;
        detalhes_pontuacao = `${posicao}ª Posição`;
      } 
      else if (tipo === 'PROPORCIONAL') {
        const quantidade = Number(res.valor) || 0;
        const pontosPorUnidade = Number(regrasPontuacao.pontos_por_unidade) || 0;
        pontuacao_obtida = quantidade * pontosPorUnidade;
        detalhes_pontuacao = `${quantidade} ${regrasPontuacao.nome_unidade || 'unidades'}`;
      }

      if (pontuacao_obtida > 0 || tipo === 'RANKING') { 
        novosResultadosDocs.push({
          gincana_id: gincanaId,
          prova_id: provaId,
          equipe_id: equipeObjId, 
          pontuacao_obtida: pontuacao_obtida,
          detalhes_pontuacao: detalhes_pontuacao,
          avaliado_por_usuario_id: avaliadorId,
          submetido_em: new Date(),
        });
      }

      if (pontuacao_obtida > 0) {
        updatesPontuacao.push({
          updateOne: {
            filter: { equipe_id: equipeObjId, gincana_id: gincanaId }, 
            update: { $inc: { pontos_acumulados: pontuacao_obtida } }
          }
        });
      }
    }
    console.log('DADOS ENVIADOS PARA O EquipeGincana.bulkWrite:', JSON.stringify(updatesPontuacao));

    // 4. Inserir novos resultados e aplicar novos pontos
    if (novosResultadosDocs.length > 0) {
      await Resultado.insertMany(novosResultadosDocs, { session });
    }
    if (updatesPontuacao.length > 0) {
      await EquipeGincana.bulkWrite(updatesPontuacao, { session });
    }

    // 5. Lançar os resultados
    await session.commitTransaction();
    res.status(201).json({ message: 'Resultados lançados com sucesso!' });

  } catch (error) {
    await session.abortTransaction();
    console.error('Erro ao lançar resultados:', error);
    res.status(500).json({ message: error.message || 'Erro interno ao salvar resultados.' });
  } finally {
    session.endSession();
  }
};