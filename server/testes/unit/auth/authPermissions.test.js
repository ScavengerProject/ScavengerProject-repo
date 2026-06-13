import jwt from 'jsonwebtoken';
import { proteger, autorizar } from '../../../src/auth/authPermissions.js';

// Helpers de mock para req/res/next (não precisa de banco aqui — é lógica pura).
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

describe('authPermissions - proteger', () => {
  const SECRET = process.env.JWT_SECRET; // definido em jestSetupAfterEnv.js

  it('chama next() e anexa req.usuario quando o token é válido', () => {
    const token = jwt.sign({ id: 'abc', tipo: 'ADMIN' }, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    proteger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.usuario).toMatchObject({ id: 'abc', tipo: 'ADMIN' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 401 quando nenhum token é fornecido', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    proteger(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado, nenhum token fornecido.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token é inválido', () => {
    const req = { headers: { authorization: 'Bearer token-invalido-xyz' } };
    const res = mockRes();
    const next = jest.fn();

    proteger(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido ou expirado.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token está expirado', () => {
    const token = jwt.sign({ id: 'abc', tipo: 'ALUNO' }, SECRET, { expiresIn: -10 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    proteger(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authPermissions - autorizar', () => {
  it('chama next() quando o tipo do usuário é permitido', () => {
    const middleware = autorizar('ADMIN', 'COORDENADOR');
    const req = { usuario: { tipo: 'COORDENADOR' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o tipo do usuário não é permitido', () => {
    const middleware = autorizar('ADMIN');
    const req = { usuario: { tipo: 'ALUNO' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Acesso negado') })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
