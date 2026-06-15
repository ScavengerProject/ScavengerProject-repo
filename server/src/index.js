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
import { iniciarEmailWorker } from './notificacoes/emailWorker.js';

dotenv.config();
connectDB(); // BD

// No plano free do Render não há Background Worker, então o worker de email roda
// no MESMO processo da API. Mantém a fila viva enquanto o Web Service estiver
// acordado (use um ping em /health para evitar a hibernação).
iniciarEmailWorker();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Endpoint leve de health check. Usado pelo pinger externo (GitHub Actions /
// UptimeRobot / cron-job.org) para manter o Web Service free acordado, e assim
// o worker de email sempre vivo (importante para provas agendadas dispararem
// no horário).
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/provas', provaRoutes);
app.use('/api/equipes/emprestimos', emprestimoEquipeRoutes);
app.use('/api/equipes/solicitacoes-emprestimo', solicitacaoEmprestimoRoutes);
app.use('/api/equipes/ofertas-emprestimo', ofertaEmprestimoRoutes);
// app.use('/api/equipes/migracoes', migracaoEquipeRoutes);
// app.use('/api/migracoes-equipe', migracaoEquipeRoutes);
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