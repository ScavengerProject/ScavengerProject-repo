import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import Usuario from '../models/Usuario.js';

const GINCANA_ATUAL_ID = 'GINCANA_PRINCIPAL'; 

/**
 * [POST] Cria uma nova equipe principal E o registro da Gincana.
 * Quem exerce: ADMIN
 * Regra: Somente usuários do tipo 'COORDENADOR' podem ser líderes.
 */
export const criarEquipe = async (req, res) => {
    try {
        const { nome, cor, coordenador_usuario_id } = req.body;

        if (!nome || !cor || !coordenador_usuario_id) {
            return res.status(400).json({ message: 'Nome, cor e coordenador são obrigatórios.' });
        }
        
        // verifica se o coordenador existe
        const coordenador = await Usuario.findById(coordenador_usuario_id);
        
        if (!coordenador) {
            return res.status(404).json({ message: 'Coordenador não encontrado.' });
        }

        // checa se é do tipo "COORDENADOR"
        if (coordenador.tipo !== 'COORDENADOR') {
            return res.status(403).json({ 
                message: `Usuários do tipo '${coordenador.tipo}' não podem ser designados como Coordenadores de Equipe.` 
            });
        }
        
        // verifica Conflito de Equipe (se o usuário já está associado a uma equipe)
        const membroExistente = await EquipeMembros.findOne({ usuario_id: coordenador_usuario_id });
        if (membroExistente) {
            return res.status(409).json({ message: 'Coordenador já pertence a outra equipe.' });
        }
        
        // Cria a equipe
        const novaEquipe = new Equipe({
            nome,
            cor,
        });
        const equipeSalva = await novaEquipe.save();
        
        // Cria o registro contextual (EquipeGincana)
        const equipeGincanaSalva = await EquipeGincana.create({
            equipe_id: equipeSalva._id,
            coordenador_usuario_id,
            gincana_id: GINCANA_ATUAL_ID,
        });

        // cria a ligação na tabela de membros
        await EquipeMembros.create({
            equipe_id: equipeSalva._id,
            usuario_id: coordenador_usuario_id,
            is_coordenador: true, // Define o primeiro membro como coordenador
        });

        const equipeCriadaPop = await EquipeGincana.findById(equipeGincanaSalva._id)
            .populate('equipe_id', 'nome cor')
            .populate('coordenador_usuario_id', 'nome email');
            
        if (!equipeCriadaPop) {
            throw new Error('Falha ao recuperar dados da equipe recém-criada.');
        }

        const equipeFormatada = {
            id: equipeCriadaPop.equipe_id._id,
            nome: equipeCriadaPop.equipe_id.nome,
            cor: equipeCriadaPop.equipe_id.cor,
            pontos_acumulados: equipeCriadaPop.pontos_acumulados,
            coordenador: equipeCriadaPop.coordenador_usuario_id,
            total_membros: 1, 
        };
        
        // Enviamos UMA ÚNICA resposta com o "bolo pronto"
        res.status(201).json({ 
            message: 'Equipe criada e coordenador associado com sucesso.', 
            equipe: equipeFormatada 
        });

    } catch (error) {
        if (error.code === 11000) { 
            return res.status(409).json({ message: 'Nome da equipe já existe.' });
        }
        console.error('Erro ao criar equipe:', error);
        res.status(500).json({ message: 'Erro interno ao criar equipe.' });
    }
};

/**
 * [GET] Lista todas as equipes com seu contexto atual (pontos/coordenador).
 * Quem exerce: ADMIN, COORDENADOR
 */
export const listarEquipes = async (req, res) => {
    try {
      /*  // busca todos os registros contextuais (equipeGincana) da Gincana ATUAL
        const gincanaRecords = await EquipeGincana.find({ gincana_id: GINCANA_ATUAL_ID })
            .populate('equipe_id', 'nome cor membros') // Popula dados mestre
            .populate('coordenador_usuario_id', 'nome email'); // Popula dados do coordenador

        // mapeia os resultados para o formato final (limpa e junta dados)
        const equipes = gincanaRecords.map(rec => {
            const equipeMaster = rec.equipe_id;
            
            if (!equipeMaster) return null; // Caso a equipe mestre tenha sido deletada
            
            return {
                id: equipeMaster._id,
                nome: equipeMaster.nome,
                cor: equipeMaster.cor,
                pontos_acumulados: rec.pontos_acumulados,
                coordenador: rec.coordenador_usuario_id,
                membros: equipeMaster.membros,
                total_membros: equipeMaster.membros.length,
            };
        }).filter(e => e !== null);


        res.status(200).json(equipes);*/

        const gincanaRecords = await EquipeGincana.find({ gincana_id: GINCANA_ATUAL_ID })
            .populate('equipe_id', 'nome cor') // Popula apenas nome e cor
            .populate('coordenador_usuario_id', 'nome email');

        const equipes = await Promise.all(gincanaRecords.map(async (rec) => {
            if (!rec.equipe_id) return null;

            // Busca o total de membros na tabela correta
            const total_membros = await EquipeMembros.countDocuments({ equipe_id: rec.equipe_id._id });

            return {
                id: rec.equipe_id._id,
                nome: rec.equipe_id.nome,
                cor: rec.equipe_id.cor,
                pontos_acumulados: rec.pontos_acumulados,
                coordenador: rec.coordenador_usuario_id,
                total_membros: total_membros,
            };
        }));

        res.status(200).json(equipes.filter(e => e !== null));
    } catch (error) {
        console.error('Erro ao listar equipes:', error);
        res.status(500).json({ message: 'Erro interno ao listar equipes.' });
    }
};


/**
 * [PATCH] Adiciona um usuário a uma equipe existente (O principal do US06)
 * Quem exerce: ADMIN
 */
export const adicionarMembro = async (req, res) => {
    try {
        /*const { id } = req.params; // ID da Equipe (Equipe._id)
        const { usuario_id } = req.body;

        if (!usuario_id) {
            return res.status(400).json({ message: 'O ID do usuário é obrigatório.' });
        }
        
        // Busca Equipe e Usuário simultaneamente
        const [equipe, usuario] = await Promise.all([
            Equipe.findById(id),
            Usuario.findById(usuario_id)
        ]);

        if (!equipe) return res.status(404).json({ message: 'Equipe não encontrada.' });
        if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        // Verifica conflitos: Se o usuário já tem outra equipe
        if (usuario.equipe_id && usuario.equipe_id.toString() !== id) {
            return res.status(409).json({ message: 'Usuário já pertence a outra equipe.' });
        }
        
        // Verifica conflitos: Se o usuário já está nessa equipe
        if (equipe.membros.map(m => m.toString()).includes(usuario_id)) {
            return res.status(409).json({ message: 'Usuário já é membro desta equipe.' });
        }

        // Executa as atualizações
        equipe.membros.push(usuario_id);
        usuario.equipe_id = equipe._id;
        
        const [equipeAtualizada] = await Promise.all([
            equipe.save(),
            usuario.save()
        ]);
        
        res.status(200).json({ 
            message: 'Membro adicionado com sucesso.', 
            equipe: equipeAtualizada
        });*/
        const { id: equipeId } = req.params; // ID da Equipe (Equipe._id)
        const { usuario_id } = req.body;

        if (!usuario_id) return res.status(400).json({ message: 'O ID do usuário é obrigatório.' });
        
        const [equipe, usuario, membroExistente, equipeGincana] = await Promise.all([
            Equipe.findById(equipeId),
            Usuario.findById(usuario_id),
            EquipeMembros.findOne({ usuario_id: usuario_id }),
            // Busca o registro da equipe na gincana atual para obter o ID correto
            EquipeGincana.findOne({ equipe_id: equipeId, gincana_id: GINCANA_ATUAL_ID })
        ]);

        if (!equipe) return res.status(404).json({ message: 'Equipe não encontrada.' });
        if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });
        if (membroExistente) return res.status(409).json({ message: 'Usuário já pertence a uma equipe.' });
        if (!equipeGincana) return res.status(404).json({ message: 'Contexto da equipe na gincana não foi encontrado. A equipe pode não estar participando.' });
        
        const novoMembro = await EquipeMembros.create({
            equipe_id: equipeId,
            usuario_id: usuario_id,
            equipe_gincana_id: equipeGincana._id,
            is_coordenador: false,
        });
        
        res.status(200).json({ 
            message: 'Membro adicionado com sucesso.', 
            membro: novoMembro
        });

    } catch (error) {
        console.error('Erro ao adicionar membro:', error);
        res.status(500).json({ message: 'Erro interno ao adicionar membro.' });
    }
};

/**
 * [GET] Lista todos os usuários que NÃO estão em nenhuma equipe, e são elegíveis para serem Coordenadores (tipo: COORDENADOR)
 */
export const listarCoordenadoresDisponiveis = async (req, res) => {
    try {
        const coordenadoresDisponiveis = await Usuario.aggregate([
            {
                // considerar os usuários que são Coordenadores
                $match: {
                    tipo: 'COORDENADOR'
                }
            },
            {
                // faz a primeira busca na tabela de membros.
                $lookup: {
                    from: "Equipes_Membros",
                    localField: "_id",
                    foreignField: "usuario_id",
                    as: "vinculo_membro"
                }
            },
            {
                // faz a segunda busca na tabela de gincanas para verificar se ele já coordena.
                $lookup: {
                    from: "Equipes_Gincana",
                    localField: "_id",
                    foreignField: "coordenador_usuario_id",
                    as: "vinculo_coordenador"
                }
            },
            {
                // Mantém apenas os usuários onde AMBOS os vínculos são arrays vazios.
                $match: {
                    vinculo_membro: { $size: 0 },
                    vinculo_coordenador: { $size: 0 }
                }
            },
            {
                // Seleciona os campos para retornar para o frontend.
                $project: {
                    _id: 1,
                    nome: 1,
                    email: 1,
                    tipo: 1,
                    turma: 1
                }
            }
        ]);

        res.status(200).json(coordenadoresDisponiveis);
    } catch (error) {
        console.error('Erro ao listar coordenadores disponíveis:', error);
        res.status(500).json({ message: 'Erro interno ao buscar coordenadores disponíveis.' });
    }
};

/**
 * [GET] Lista todas as EquipeGincana (para seleção em empréstimos)
 */
export const listarEquipesGincana = async (req, res) => {
  try {
    const equipesGincana = await EquipeGincana.find({})
      .populate('equipe_id', 'nome cor')
      .populate('coordenador_usuario_id', 'nome email')
      .populate('gincana_id', 'nome')
      .sort({ 'equipe_id.nome': 1 });

    // Formata para o frontend
    const equipesFormatadas = equipesGincana.map(eg => ({
      _id: eg._id,
      nome: eg.equipe_id?.nome || 'Sem nome',
      cor: eg.equipe_id?.cor,
      coordenador: eg.coordenador_usuario_id?.nome,
      gincana: eg.gincana_id?.nome,
    }));

    res.status(200).json(equipesFormatadas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar equipes.', error: error.message });
  }
};

/**
 * [GET] Lista todos os membros de todas as equipes com dados populados do usuário
 */
export const listarTodosMembros = async (req, res) => {
  try {
    const membros = await EquipeMembros.find({})
      .populate('usuario_id', 'nome email tipo turma')
      .populate('equipe_id', 'nome cor')
      .sort('usuario_id.nome');

    // Extrair usuários únicos
    const usuariosUnicos = [];
    const usuariosProcessados = new Set();

    membros.forEach(membro => {
      if (membro.usuario_id && membro.usuario_id._id && !usuariosProcessados.has(membro.usuario_id._id.toString())) {
        usuariosProcessados.add(membro.usuario_id._id.toString());
        usuariosUnicos.push({
          _id: membro.usuario_id._id,
          nome: membro.usuario_id.nome,
          email: membro.usuario_id.email,
          tipo: membro.usuario_id.tipo,
          turma: membro.usuario_id.turma,
        });
      }
    });

    res.status(200).json(usuariosUnicos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar membros.', error: error.message });
  }
};

/**
 * [GET] Lista usuários que NÃO estão em nenhuma equipe e SÃO ELEGÍVEIS para serem membros comuns (exclui ADMIN e COORDENADOR)
 */
export const listarUsuariosSemEquipe = async (req, res) => {
    try {
        console.log("Executando query para Membros Comuns disponíveis..."); 
        
       /* const usuarios = await Usuario.find({ 
            equipe_id: null,
            tipo: { $nin: ['ADMIN', 'COORDENADOR'] }
        })
        .select('nome email tipo turma'); 

        console.log(`Encontrados ${usuarios.length} usuários disponíveis.`);
        
        res.status(200).json(usuarios);*/
        // A agregação é a forma mais robusta de encontrar usuários que não estão na tabela de membros.
        const usuariosDisponiveis = await Usuario.aggregate([
            {
                // Para cada usuário, ele tenta encontrar um registro correspondente em Equipes_Membros.
                $lookup: {
                    from: "Equipes_Membros", // O nome da sua coleção de membros
                    localField: "_id",
                    foreignField: "usuario_id",
                    as: "vinculo_equipe" // Cria um array temporário com os resultados da junção
                }
            },
            {
                // filtra os resultados 'vinculo_equipe' está VAZIO, o que significa que não foi encontrado nenhum vínculo.
                $match: {
                    vinculo_equipe: { $size: 0 }
                }
            },
            {
                //para excluir os tipos de usuário indesejados.
                $match: {
                    tipo: { $nin: ['ADMIN', 'COORDENADOR'] }
                }
            },
            {
                // Seleciona apenas os campos que deve retornar para o frontend.
                $project: {
                    _id: 1,
                    nome: 1,
                    email: 1,
                    tipo: 1,
                    turma: 1
                }
            }
        ]);

        console.log(`Encontrados ${usuariosDisponiveis.length} usuários disponíveis.`);
        
        res.status(200).json(usuariosDisponiveis);
    } catch (error) {
        console.error('ERRO FATAL na query de usuários disponíveis:', error); 
        res.status(500).json({ message: 'Erro interno ao buscar usuários disponíveis.' });
    }
};

/**
 * GET visualizar detalhes e membros da própria equipe
 */
export const visualizarEquipe = async (req, res) => {
    try {
        const coordenadorId = req.usuario.id;

        // 1. Valida se o usuário é o coordenador e obtém o ID da equipe
        const registroGincana = await EquipeGincana.findOne({ coordenador_usuario_id: coordenadorId });
        if (!registroGincana) return res.status(403).json({ message: 'Você não é o coordenador de uma equipe.' });
        
        const equipeId = registroGincana.equipe_id;

        // 2. Busca os detalhes da equipe e os membros em paralelo
        const [equipe, membrosDaEquipe] = await Promise.all([
            Equipe.findById(equipeId),
            EquipeMembros.find({ equipe_id: equipeId }).populate('usuario_id', 'nome email tipo turma')
        ]);
        
        if (!equipe) return res.status(404).json({ message: 'Equipe não encontrada.' });

        // 3. Formata a resposta
        const respostaFormatada = {
            equipeInfo: {
                _id: equipe._id,
                nome: equipe.nome,
                cor: equipe.cor,
            },
            // Extrai apenas os dados dos usuários populados
            membros: membrosDaEquipe.map(membro => membro.usuario_id)
        };
        
        res.status(200).json(respostaFormatada);

    } catch (error) {
        console.error('Erro ao visualizar a equipe do coordenador:', error);
        res.status(500).json({ message: 'Erro interno ao buscar sua equipe.' });
    }
};

/**
 * [DELETE] Remover um membro da sua própria equipe.
 */
export const removerMembroEquipe = async (req, res) => {
    try {
        const coordenadorId = req.usuario.id;
        const { membroId } = req.params; 

        if (!membroId) {
            return res.status(400).json({ message: 'O ID do membro a ser removido é obrigatório.' });
        }
        if (membroId === coordenadorId) {
            return res.status(400).json({ message: 'O coordenador não pode remover a si mesmo.' });
        }

        // valida se o requisitante é o coordenador da equipe
        const registroGincana = await EquipeGincana.findOne({ coordenador_usuario_id: coordenadorId });
        if (!registroGincana) {
            return res.status(403).json({ message: 'Você não coordena uma equipe.' });
        }

        // encontra e remove o registro do membro na tabela de ligação
        const resultado = await EquipeMembros.findOneAndDelete({
            equipe_id: registroGincana.equipe_id, // Garante que é da equipe certa
            usuario_id: membroId                 // Usa o ID vindo da URL
        });

        if (!resultado) {
            return res.status(404).json({ message: 'Membro não encontrado nesta equipe.' });
        }

        // ✅ CORREÇÃO: Envia uma resposta JSON válida no sucesso
        res.status(200).json({ message: 'Membro removido com sucesso.' });

    } catch (error) {
        console.error('Erro ao remover membro:', error);
        res.status(500).json({ message: 'Erro interno ao remover membro.' });
    }
};

/**
 * [POST] Inscrever um aluno autenticado em uma equipe (USER STORY)
 * O aluno só pode inscrever a si mesmo
 */
export const inscreverAlunoEmEquipe = async (req, res) => {
    try {
        const alunoId = req.usuario.id; // Do token JWT
        const { equipeId } = req.params;

        if (!equipeId) {
            return res.status(400).json({ message: 'O ID da equipe é obrigatório.' });
        }

        // Validações em paralelo
        const [aluno, equipe, membroExistente, equipeGincana] = await Promise.all([
            Usuario.findById(alunoId),
            Equipe.findById(equipeId),
            EquipeMembros.findOne({ usuario_id: alunoId }),
            EquipeGincana.findOne({ equipe_id: equipeId, gincana_id: GINCANA_ATUAL_ID })
        ]);

        // Validações
        if (!aluno) {
            return res.status(404).json({ message: 'Aluno não encontrado.' });
        }

        if (!equipe) {
            return res.status(404).json({ message: 'Equipe não encontrada.' });
        }

        // Verifica se o usuário já pertence a alguma equipe
        if (membroExistente) {
            return res.status(409).json({ message: 'Você já pertence a uma equipe. Deixe sua equipe atual para se inscrever em outra.' });
        }

        if (!equipeGincana) {
            return res.status(404).json({ message: 'A equipe não está participando da gincana atual.' });
        }

        // Cria a inscrição
        const novaInscricao = await EquipeMembros.create({
            equipe_id: equipeId,
            usuario_id: alunoId,
            is_coordenador: false,
        });

        res.status(201).json({
            message: 'Você se inscreveu na equipe com sucesso!',
            inscricao: novaInscricao
        });

    } catch (error) {
        console.error('Erro ao inscrever aluno em equipe:', error);
        res.status(500).json({ message: 'Erro interno ao processar inscrição.' });
    }
export const listarEquipesPublicas = async (req, res) => {
  try {
    const equipes = await Equipe.find({}, 'nome cor');
    return res.status(200).json(equipes);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar equipes públicas.', error: error.message });
  }
};

};