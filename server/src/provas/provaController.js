import Prova from '../models/Prova.js';

/**
 * Controller para criar uma nova prova.
 * Acessível apenas por administradores.
 */
export const criarProva = async (req, res) => {
  try {
    const { titulo, descricao, formato } = req.body;

    if (!titulo || !descricao || !formato) {
      return res.status(400).json({ message: 'Campos título, descrição e formato são obrigatórios.' });
    }

    const novaProva = new Prova({
      ...req.body,
      criado_por_usuario_id: req.usuario.id,
    });

    const provaSalva = await novaProva.save();

    res.status(201).json(provaSalva);

  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar a prova.', error: error.message });
  }
};