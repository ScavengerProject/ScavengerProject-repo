import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; // importando o BD
import authRoutes from './auth/authRoutes.js';
import provaRoutes from './provas/provaRoutes.js';
import equipeRoutes from './equipes/equipeRoutes.js';
import migracaoEquipeRoutes from './equipes/migracaoEquipeRoutes.js';
import emprestimoEquipeRoutes from './equipes/emprestimoEquipeRoutes.js';
import usuarioRoutes from './usuarios/usuarioRoutes.js';

dotenv.config();
connectDB(); // BD

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/provas', provaRoutes);
app.use('/api/equipes/emprestimos', emprestimoEquipeRoutes);
app.use('/api/equipes/migracoes', migracaoEquipeRoutes);
app.use('/api/migracoes-equipe', migracaoEquipeRoutes);
app.use('/api/equipes', equipeRoutes); // Rota genérica por último para não interceptar as específicas
app.use('/api/usuarios', usuarioRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});