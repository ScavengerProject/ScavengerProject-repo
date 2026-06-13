// Conexão com o BD

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Define o ambiente. Sem NODE_ENV setado, assume 'development' por segurança,
const ambiente = process.env.NODE_ENV || 'development';

// Em produção usa o banco de produção (MONGO_URI);
// em qualquer outro ambiente usa o banco de testes (MONGO_URI_DEV).
const uri = ambiente === 'production'
  ? process.env.MONGO_URI
  : process.env.MONGO_URI_DEV;

const connectDB = async () => {
  if (!uri) {
    console.error(
      `❌ ERRO: variável de conexão não definida para o ambiente "${ambiente}". ` +
      `Defina ${ambiente === 'production' ? 'MONGO_URI' : 'MONGO_URI_DEV'} no .env.`
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB conectado com sucesso (ambiente: ${ambiente}).`);
  } catch (err) {
    console.error(`❌ ERRO ao conectar com MongoDB: ${err.message}`);
    process.exit(1);
  }
};

// Exportação
export default connectDB;