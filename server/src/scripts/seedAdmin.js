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
    // Verifica se um usuário do tipo 'ADMIN' já existe
    const adminExists = await Usuario.findOne({ tipo: 'ADMIN' });
    
    if (adminExists) {
      console.log('Usuário ADMIN já existe no banco de dados.');
      return;
    }

    // Se não existir, cria a instância do novo usuário administrador
    const adminUser = new Usuario({
      nome: 'Administrador Gincana',
      email: 'admin@gincana.com',
      senha: 'admin123', // A senha será criptografada automaticamente pelo Model 'Usuario.js'
      tipo: 'ADMIN',
      status: 'ATIVO',
    });

    // Salva o novo usuário no banco de dados
    await adminUser.save();

    console.log('Usuário ADMIN criado com sucesso!');
    console.log('- Email: admin@gincana.com');
    console.log('- Senha: admin123');
    console.log('Use estas credenciais para fazer login na API.');

  } catch (error) {
    console.error('Erro ao tentar criar o usuário ADMIN:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Conexão com o MongoDB encerrada.');
  }
};

createAdmin();