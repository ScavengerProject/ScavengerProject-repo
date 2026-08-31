// Conexão com o BD

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Gincana from '../models/Gincana.js';

dotenv.config();

// Define o ambiente. Sem NODE_ENV setado, assume 'development' por segurança,
const ambiente = process.env.NODE_ENV || 'development';

// Em produção usa o banco de produção (MONGO_URI);
// em qualquer outro ambiente usa o banco de testes (MONGO_URI_DEV).
const uri = ambiente === 'production'
  ? process.env.MONGO_URI
  : process.env.MONGO_URI_DEV;

const connectDB = async () => {
  // Idempotente: se já estiver conectado (1) ou conectando (2), não reabre.
  // Importante porque o worker in-process e a API podem chamar connectDB().
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  if (!uri) {
    console.error(
      `❌ ERRO: variável de conexão não definida para o ambiente "${ambiente}". ` +
      `Defina ${ambiente === 'production' ? 'MONGO_URI' : 'MONGO_URI_DEV'} no .env.`
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);

    // Migração idempotente do multi-escola. Antes, Gincana possuía o índice
    // único global { nome, ano }; apenas alterar o schema não remove esse índice
    // já criado no MongoDB. Sem esta sincronização, uma escola nova não consegue
    // criar "Gincana 2026" se outra escola já usa o mesmo nome/ano.
    //
    // É feita na conexão para não depender de alguém lembrar de executar um seed
    // manualmente em cada ambiente. syncIndexes mantém os índices declarados no
    // schema atual e remove somente os índices obsoletos desta coleção.
    await Gincana.syncIndexes();
    console.log(`✅ MongoDB conectado com sucesso (ambiente: ${ambiente}).`);
  } catch (err) {
    console.error(`❌ ERRO ao conectar com MongoDB: ${err.message}`);
    process.exit(1);
  }
};

// Exportação
export default connectDB;
