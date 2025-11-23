// Conexão com o BD

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB conectado com sucesso.');
  } catch (err) {
    console.error(`❌ ERRO ao conectar com MongoDB: ${err.message}`);
    process.exit(1);
  }
};

// Exportação
export default connectDB;