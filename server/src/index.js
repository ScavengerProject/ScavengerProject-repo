import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; // importando o BD
import Teste from './models/Teste.js'; // importando o teste do BD
import authRoutes from './auth/authRoutes.js';

dotenv.config();
connectDB(); // BD

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// ROTA DO TESTE DO BD

app.get('/api/teste-db', async (req, res) => {
    try {
        const novoTeste = new Teste();
        await novoTeste.save();
        const todosTestes = await Teste.find({});

        return res.status(200).json({
            status: 'SUCESSO TOTAL',
            mensagem: 'Conexão Node -> MongoDB está 100% funcional. Inserção e Leitura OK.',
            total_registros: todosTestes.length,
            ultimo_registro_salvo: novoTeste
        });
    } catch (error) {
        console.error('Erro na rota de teste de DB:', error);
        return res.status(500).json({
            status: 'ERRO NO DB',
            mensagem: 'Falha na operação de banco de dados. Verifique o servidor mongod e a URI.',
            detalhe: error.message
        });
    }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});