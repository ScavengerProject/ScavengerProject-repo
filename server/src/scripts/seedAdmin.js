import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Usuario from '../models/Usuario.js';

dotenv.config();

/**
 * Este script serve para popular o banco de dados com o usuário administrador inicial.
 * Ele deve ser executado uma vez para configurar um novo ambiente de banco de dados.
 */
const createAdmin = async () => {
  await connectDB();

  try {
    // 1. LER CREDENCIAIS DAS VARIÁVEIS DE AMBIENTE
    const emailAdmin = process.env.ADMIN_EMAIL;
    const senhaAdmin = process.env.ADMIN_PASSWORD;

    if (!emailAdmin || !senhaAdmin) {
        console.error('ERRO: As variáveis ADMIN_EMAIL e ADMIN_PASSWORD não estão definidas no .env');
        return;
    }

    // Verifica se um usuário do tipo 'ADMIN' já existe
    const adminExists = await Usuario.findOne({ tipo: 'ADMIN' });
    
    if (adminExists) {
      return;
    }

    // Se não existir, cria a instância do novo usuário administrador
    const adminUser = new Usuario({
      nome: 'Administrador Gincana',
      email: emailAdmin, // .ENV
      senha: senhaAdmin, // .ENV
      tipo: 'ADMIN',
      status: 'ATIVO',
    });

    // Salva o novo usuário no banco de dados
    await adminUser.save();

  } catch (error) {
    console.error('Erro ao tentar criar o usuário ADMIN:', error.message);
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();