import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; // importando o BD
import authRoutes from './auth/authRoutes.js';
import provaRoutes from './provas/provaRoutes.js';
import equipeRoutes from './equipes/equipeRoutes.js';
import migracaoEquipeRoutes from './equipes/migracaoEquipeRoutes.js';
import emprestimoEquipeRoutes from './equipes/emprestimoEquipeRoutes.js';
import solicitacaoEmprestimoRoutes from './equipes/solicitacaoEmprestimoRoutes.js';
import ofertaEmprestimoRoutes from './equipes/ofertaEmprestimoRoutes.js';
import usuarioRoutes from './usuarios/usuarioRoutes.js';
import feedbackRoutes from './feedbacks/feedbackRoutes.js';
import notificacaoRoutes from './notificacoes/notificacaoRoutes.js';
import penalidadesRoutes from "./penalidades/penalidadesRoutes.js";
import resultadoRoutes from './resultados/resultadoRoutes.js';
import configuracaoRoutes from './configuracoes/configuracaoRoutes.js';

dotenv.config();
connectDB(); // BD

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/provas', provaRoutes);
app.use('/api/equipes/emprestimos', emprestimoEquipeRoutes);
app.use('/api/equipes/solicitacoes-emprestimo', solicitacaoEmprestimoRoutes);
app.use('/api/equipes/ofertas-emprestimo', ofertaEmprestimoRoutes);
app.use('/api/equipes/migracoes', migracaoEquipeRoutes);
app.use('/api/migracoes-equipe', migracaoEquipeRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/equipes', equipeRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use("/api/penalidades", penalidadesRoutes);
app.use('/api/resultados', resultadoRoutes);
app.use('/api/configuracoes', configuracaoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});