import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

/**
 * Função que valida as credenciais de login.
 */
export const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'Por favor, forneça email e senha.' });
  }

  try {
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    res.status(200).json({ message: 'Dados ok, logado' });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).send('Erro interno no servidor.');
  }
};