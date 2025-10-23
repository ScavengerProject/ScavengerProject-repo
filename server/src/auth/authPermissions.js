import jwt from 'jsonwebtoken';

/* Middleware que verifica se o usuário possui permissão e um token
  de autenticação válido*/
export const proteger = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded; // Anexa os dados do usuário na requisição
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado, nenhum token fornecido.' });
  }
};

// Verifica se o usuário tem o perfil necessário
export const autorizar = (...tipos) => {
  return (req, res, next) => {
    if (!tipos.includes(req.usuario.tipo)) {
      return res.status(403).json({ message: `Acesso negado. Apenas os perfis [${tipos.join(', ')}] são permitidos.` });
    }
    next();
  };
};