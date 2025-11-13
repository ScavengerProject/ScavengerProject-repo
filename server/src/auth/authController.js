import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import jwt from 'jsonwebtoken';

/**
 * Função que valida as credenciais de login e retorna token de acesso.
 */
export const login = async (req, res) => {
  const { email, senha, password } = req.body;
  
  // Aceita tanto 'senha' quanto 'password' para compatibilidade
  const senhaFinal = senha || password;

  if (!email || !senhaFinal) {
    return res.status(400).json({ 
      message: 'Por favor, forneça email e senha.',
      errors: [
        !email ? { code: 'VALIDATION_ERROR', field: 'email', message: 'Field required' } : null,
        !senhaFinal ? { code: 'VALIDATION_ERROR', field: 'password', message: 'Field required' } : null
      ].filter(Boolean),
      success: false
    });
  }

  try {
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const senhaCorreta = await bcrypt.compare(senhaFinal, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // os dados que vão dentro do token
    const payload = {
      id: usuario._id,
      nome: usuario.nome,
      tipo: usuario.tipo,
    };

    // Gera o token de autenticação
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    // Envia a resposta de sucesso com o token e dados do usuário
    res.status(200).json({
      message: 'Login realizado com sucesso!',
      token: token,
      usuario: { 
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).send('Erro interno no servidor.');
  }
};