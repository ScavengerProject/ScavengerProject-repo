import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; // importando o BD
import authRoutes from './auth/authRoutes.js';
import provaRoutes from './provas/provaRoutes.js';

dotenv.config();
connectDB(); // BD

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/provas', provaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});