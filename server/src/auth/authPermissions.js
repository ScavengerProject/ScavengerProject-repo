import jwt from 'jsonwebtoken';
import Gincana from '../models/Gincana.js';
import { usuarioParticipaDaGincana } from '../gincanas/gincanaHelpers.js';

// Gincana legada (dados anteriores ao multi-gincana). Usada como fallback quando
// o cliente não envia o header X-Gincana-Id.
const GINCANA_FALLBACK_ID = 'GINCANA_PRINCIPAL';

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

/**
 * Middleware de escopo de gincana. Deve ser encadeado DEPOIS de `proteger`.
 *
 * Resolve a gincana "ativa" da requisição a partir do header `X-Gincana-Id`:
 *  - valida que a gincana existe;
 *  - para perfis não-ADMIN, valida que o usuário participa dela (403 caso contrário);
 *  - injeta `req.gincanaId` (String) para uso nos controllers.
 *
 * Se o header não vier (ex.: cache antigo do front), usa a gincana legada
 * 'GINCANA_PRINCIPAL' como fallback e registra um aviso em log.
 */
export const resolverGincana = async (req, res, next) => {
  try {
    const headerGincanaId = req.headers['x-gincana-id'];

    if (!headerGincanaId) {
      console.warn(
        `[resolverGincana] Requisição sem X-Gincana-Id em ${req.method} ${req.originalUrl}; ` +
        `usando fallback '${GINCANA_FALLBACK_ID}'.`
      );
      req.gincanaId = GINCANA_FALLBACK_ID;
      return next();
    }

    const gincana = await Gincana.findById(headerGincanaId);
    if (!gincana) {
      return res.status(404).json({ message: 'Gincana não encontrada.' });
    }

    // ADMIN opera em qualquer gincana; demais perfis só nas que participam.
    if (req.usuario.tipo !== 'ADMIN') {
      const participa = await usuarioParticipaDaGincana(req.usuario.id, headerGincanaId);
      if (!participa) {
        return res.status(403).json({ message: 'Você não participa desta gincana.' });
      }
    }

    req.gincanaId = String(gincana._id);
    req.gincana = gincana;
    next();
  } catch (error) {
    console.error('Erro ao resolver gincana:', error);
    res.status(500).json({ message: 'Erro interno ao resolver o escopo da gincana.' });
  }
};