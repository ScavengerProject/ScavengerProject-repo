import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
import EquipeMembros from '../models/EquipeMembros.js';
import Usuario from '../models/Usuario.js';

const GINCANA_ATUAL_ID = 'GINCANA_PRINCIPAL'; 

/**
 * [POST] Cria uma nova equipe principal e o registro da Gincana.
 * Quem exerce: ADMIN. O Coordenador é atribuído posteriormente.
 */
export const criarEquipe = async (req, res) => {
    try {
        // 1. Recebe APENAS nome e cor
        const { nome, cor } = req.body;

        // 2. Validação Mínima
        if (!nome || !cor) {
            return res.status(400).json({ message: 'Nome e cor são obrigatórios.' });
        }
        
        // 3. Cria a Equipe Principal (Master Data)
        const novaEquipe = new Equipe({
            nome,
            cor,
            membros: [], // Inicia sem membros
        });
        const equipeSalva = await novaEquipe.save();
        
        // 4. Cria o registro contextual (EquipeGincana)
        const equipeGincanaSalva = await EquipeGincana.create({
            equipe_id: equipeSalva._id,
            coordenador_usuario_id: null, 
            gincana_id: GINCANA_ATUAL_ID,
        });

        // 5. Busca e Popula o objeto final para retorno
        // (Ainda populamos o coordenador, que será null, para manter a consistência)
        const equipeCriadaPop = await EquipeGincana.findOne({ equipe_id: equipeSalva._id })
            .populate('equipe_id', 'nome cor')
            .populate('coordenador_usuario_id', 'nome email');
            
        const equipeFormatada = {
            id: equipeCriadaPop.equipe_id._id,
            nome: equipeCriadaPop.equipe_id.nome,
            cor: equipeCriadaPop.equipe_id.cor,
            pontos_acumulados: equipeCriadaPop.pontos_acumulados,
            coordenador: equipeCriadaPop.coordenador_usuario_id, // (Será null)
            total_membros: 0, // Inicia com 0 membros
        };

        res.status(201).json({ 
            message: 'Equipe criada com sucesso. Coordenador pendente.', 
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
 * Rota utilizada para popular o Select de Coordenadores (Troca/Criação).
 */
export const listarCoordenadoresDisponiveis = async (req, res) => {
    try {
        // A agregação é a forma mais robusta de encontrar usuários livres.
        const coordenadoresDisponiveis = await Usuario.aggregate([
            { $match: { tipo: 'COORDENADOR' } }, // Filtra por tipo COORDENADOR
            {
                // Verifica se o usuário já é membro de alguma equipe
                $lookup: {
                    from: EquipeMembros.collection.name, // Nome da sua coleção de membros
                    localField: "_id",
                    foreignField: "usuario_id",
                    as: "vinculo_membro"
                }
            },
            {
                // Verifica se o usuário já coordena uma equipe (registro na EquipeGincana)
                $lookup: {
                    from: EquipeGincana.collection.name, 
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
                    _id: 1, nome: 1, email: 1, tipo: 1, turma: 1
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
 * [GET] Lista todos os membros (Usuários) de uma equipe específica.
 * Rota: /api/equipes/:equipeId/membros
 * Quem exerce: ADMIN, COORDENADOR
 */
export const listarMembrosPorEquipe = async (req, res) => {
    try {
        const { equipeId } = req.params; 

        // 1. Busca os registros de membros (Corrigido o populate)
        const registrosMembros = await EquipeMembros.find({ equipe_id: equipeId })
            // CORRIGIDO: Retirado o .select('is_coordenador usuario_id') daqui, 
            // pois o find() já retorna o objeto inteiro, e o select dentro do populate é suficiente.
            .populate('usuario_id', 'nome email tipo turma'); 
            
        // Se a busca falhar por um ID mal formado, ela cai no catch com CastError.
        if (!registrosMembros) {
             return res.status(500).json({ message: 'Falha na busca de membros no banco de dados.' });
        }

        // 3. Formata os dados para o frontend
        const membros = registrosMembros.map(reg => {
            const usuario = reg.usuario_id;
            
            if (!usuario) return null; 

            return {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo,
                turma: usuario.turma,
                isCoordenador: reg.is_coordenador, // is_coordenador vem do registro EquipeMembros (reg)
            };
        }).filter(m => m !== null);

        res.status(200).json(membros);

    } catch (error) {
        // Loga o erro COMPLETO no servidor (PARA VER O CASTERROR se for o caso)
        console.error('ERRO FATAL AO LISTAR MEMBROS:', error.message, error); 
        
        // Retorna 500 para o frontend
        return res.status(500).json({ 
            message: 'Erro interno ao listar membros da equipe.',
            details: error.message 
        });
    }
};

/**
 * [DELETE] Exclui uma equipe e todos os seus registros associados em todas as collections.
 * Quem pode: ADMIN
 */
export const deletarEquipe = async (req, res) => {
    try {
        const { id: equipeId } = req.params;

        const equipe = await Equipe.findById(equipeId);
        if (!equipe) {
            return res.status(404).json({ message: 'Equipe não encontrada.' });
        }

        await Promise.all([
            EquipeMembros.deleteMany({ equipe_id: equipeId }),
            EquipeGincana.deleteMany({ equipe_id: equipeId }), 

            Equipe.findByIdAndDelete(equipeId), 
        ]);

        res.status(200).json({ message: 'Equipe excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar equipe:', error);
        res.status(500).json({ message: 'Erro interno ao deletar equipe.' });
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
            
            // Filtra os membros para excluir o próprio Coordenador.
            EquipeMembros.find({ 
                equipe_id: equipeId,
                usuario_id: { $ne: coordenadorId } // Adiciona a condição: usuario_id NÃO É IGUAL ao coordenadorId
            }).populate('usuario_id', 'nome email tipo turma')
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
};

/**
 * [PUT] Atualiza o nome, cor e, opcionalmente, o coordenador de uma equipe.
 * Rota: /api/equipes/:id
 * Quem exerce: ADMIN
 */
export const atualizarEquipe = async (req, res) => {
    try {
        const { id: equipeId } = req.params;
        const { nome, cor, coordenador_usuario_id } = req.body;
        
        // 1. Validação mínima
        if (!nome || !cor) {
            return res.status(400).json({ message: 'Nome e cor são obrigatórios.' });
        }

        // 2. Busca a Equipe Mestra e o Contexto da Gincana
        const [equipe, equipeContexto] = await Promise.all([
            Equipe.findById(equipeId),
            EquipeGincana.findOne({ equipe_id: equipeId, gincana_id: GINCANA_ATUAL_ID }),
        ]);

        if (!equipe) return res.status(404).json({ message: 'Equipe não encontrada.' });
        if (!equipeContexto) return res.status(404).json({ message: 'Contexto da Gincana não encontrado.' });
        
        const updates = [];
        let novoCoordenadorObj = null;
        const coordenadorAntigoId = equipeContexto.coordenador_usuario_id?.toString();

        // 3. Lógica para MUDANÇA/ATRIBUIÇÃO de Coordenador
        if (coordenador_usuario_id !== undefined) {
            
            // A. Tenta atribuir um novo coordenador
            if (coordenador_usuario_id && coordenador_usuario_id !== coordenadorAntigoId) {
                
                novoCoordenadorObj = await Usuario.findById(coordenador_usuario_id);
                if (!novoCoordenadorObj) return res.status(404).json({ message: 'Novo coordenador não encontrado.' });
                if (novoCoordenadorObj.tipo !== 'COORDENADOR') return res.status(403).json({ message: 'Novo coordenador deve ser do tipo COORDENADOR.' });

                // Verifica se o novo coordenador já está em outra equipe (membros)
                const membroConflito = await EquipeMembros.findOne({ usuario_id: coordenador_usuario_id });
                if (membroConflito) return res.status(409).json({ message: 'Novo coordenador já é membro de uma equipe.' });
                
                // Remove o antigo coordenador da tabela de membros (se houver)
                if (coordenadorAntigoId) {
                    updates.push(EquipeMembros.findOneAndDelete({ equipe_id: equipeId, usuario_id: coordenadorAntigoId, is_coordenador: true }));
                }

                // Adiciona o novo coordenador na tabela de membros
                updates.push(EquipeMembros.create({
                    equipe_id: equipeId,
                    usuario_id: coordenador_usuario_id,
                    equipe_gincana_id: equipeContexto._id,
                    is_coordenador: true,
                }));

                equipeContexto.coordenador_usuario_id = coordenador_usuario_id;
            
            // B. O Coordenador está sendo setado para NULO
            } else if (!coordenador_usuario_id && coordenadorAntigoId) {
                // Remove o antigo coordenador da tabela de membros
                updates.push(EquipeMembros.findOneAndDelete({ equipe_id: equipeId, usuario_id: coordenadorAntigoId, is_coordenador: true }));
                equipeContexto.coordenador_usuario_id = null;
            }
        }
        
        // 4. Atualiza Nome e Cor (Equipe Mestra)
        equipe.nome = nome;
        equipe.cor = cor;
        
        // 5. Executa as atualizações transacionais
        updates.push(equipe.save());
        updates.push(equipeContexto.save());
        await Promise.all(updates);

        // 6. Busca a equipe atualizada e populada para o frontend
        const total_membros = await EquipeMembros.countDocuments({ equipe_id: equipeId });
        const equipeFinalPop = await EquipeGincana.findOne({ equipe_id: equipeId })
            .populate('equipe_id', 'nome cor')
            .populate('coordenador_usuario_id', 'nome email');
            
        const equipeFormatada = {
            id: equipeId,
            nome: equipeFinalPop.equipe_id.nome,
            cor: equipeFinalPop.equipe_id.cor,
            pontos_acumulados: equipeFinalPop.pontos_acumulados,
            coordenador: equipeFinalPop.coordenador_usuario_id, 
            total_membros: total_membros,
        };

        res.status(200).json({ message: 'Equipe atualizada com sucesso.', equipe: equipeFormatada });

    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'Nome da equipe já existe.' });
        console.error('Erro ao atualizar equipe:', error);
        res.status(500).json({ message: 'Erro interno ao atualizar equipe.' });
    }
};

export const listarEquipesPublicas = async (req, res) => {
  try {
    const meId = req.usuario.id;
    
    // Busca a equipe atual do usuário (através de EquipeMembros)
    const membroAtual = await EquipeMembros.findOne({ usuario_id: meId });
    
    // Se não está em nenhuma equipe, retorna todas
    if (!membroAtual) {
      const equipes = await Equipe.find({}, 'nome cor');
      return res.status(200).json(equipes);
    }
    
    // membroAtual.equipe_id é o _id de EquipeGincana, então precisamos buscar o equipe_id real
    const equipeGincana = await EquipeGincana.findById(membroAtual.equipe_id);
    if (!equipeGincana) {
      const equipes = await Equipe.find({}, 'nome cor');
      return res.status(200).json(equipes);
    }
    
    // Agora excluímos a equipe atual (usando o equipe_id de EquipeGincana)
    const equipes = await Equipe.find({ _id: { $ne: equipeGincana.equipe_id } }, 'nome cor');
    return res.status(200).json(equipes);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar equipes públicas.', error: error.message });
  }
};

/**
 * [PATCH] Atribui ou remove um Coordenador de uma equipe existente. (PATCH /api/equipes/:id/coordenador)
 * Quem exerce: ADMIN
 * Lógica: Remove o antigo Coordenador da EquipeMembros e adiciona o novo (se fornecido).
 */
export const atribuirCoordenador = async (req, res) => {
  try {
    const { id: equipeId } = req.params;
    // aceita vários nomes no body para evitar incompatibilidade com front
    const novoCoordenadorId = req.body.usuario_id ?? req.body.novoCoordenadorId ?? req.body.coordId ?? null;

    // Busca o contexto da gincana (onde está o coordenador registrado)
    const equipeContexto = await EquipeGincana.findOne({ equipe_id: equipeId, gincana_id: GINCANA_ATUAL_ID });
    if (!equipeContexto) {
      return res.status(404).json({ message: 'Contexto da equipe na gincana não encontrado.' });
    }

    const coordenadorAntigoId = equipeContexto.coordenador_usuario_id?.toString() || null;

    const updates = [];

    // 1) Se houver um coordenador antigo diferente do novo, apenas alteramos seu TIPO para 'ALUNO'
    if (coordenadorAntigoId && coordenadorAntigoId !== (novoCoordenadorId || null)) {
      // Atualiza o tipo do usuário antigo para ALUNO (não removemos da equipe)
      updates.push(
        Usuario.findByIdAndUpdate(coordenadorAntigoId, { $set: { tipo: 'ALUNO' } }, { new: true })
      );

      // Garante que o registro em EquipeMembros para o antigo exista e tenha is_coordenador: false
      updates.push(
        EquipeMembros.findOneAndUpdate(
          { equipe_id: equipeId, usuario_id: coordenadorAntigoId },
          { $set: { is_coordenador: false } },
          { upsert: false, new: true }
        )
      );
    }

    // 2) Se um novo coordenador foi indicado (não é null/''), tratamos o novo
    if (novoCoordenadorId) {
      const novoUser = await Usuario.findById(novoCoordenadorId);
      if (!novoUser) {
        return res.status(404).json({ message: 'Usuário indicado como coordenador não encontrado.' });
      }

      // 2.a) Atualiza o tipo do novo usuário para 'COORDENADOR' (se necessário)
      if (novoUser.tipo !== 'COORDENADOR') {
        updates.push(Usuario.findByIdAndUpdate(novoCoordenadorId, { $set: { tipo: 'COORDENADOR' } }, { new: true }));
      }

      // 2.b) Garante que exista registro em EquipeMembros com is_coordenador: true
      // Se existir, atualiza is_coordenador para true. Se não existir, cria (upsert)
      updates.push(
        EquipeMembros.findOneAndUpdate(
          { equipe_id: equipeId, usuario_id: novoCoordenadorId },
          { $set: { is_coordenador: true, equipe_gincana_id: equipeContexto._id } },
          { upsert: true, new: true }
        )
      );

      // 2.c) Define no contexto quem é o coordenador
      equipeContexto.coordenador_usuario_id = novoCoordenadorId;
    } else {
      // Se novoCoordenadorId for null => estamos removendo o coordenador (set null)
      equipeContexto.coordenador_usuario_id = null;
    }

    // 3) Salva o contexto atualizado
    updates.push(equipeContexto.save());

    // Executa todas as operações em paralelo
    await Promise.all(updates);

    // 4) Monta resposta populada para o frontend (igual ao padrão que você já usa)
    const total_membros = await EquipeMembros.countDocuments({ equipe_id: equipeId });
    const equipeFinalPop = await EquipeGincana.findOne({ equipe_id: equipeId })
      .populate('equipe_id', 'nome cor')
      .populate('coordenador_usuario_id', 'nome email');

    const equipeFormatada = {
      id: equipeId,
      nome: equipeFinalPop.equipe_id.nome,
      cor: equipeFinalPop.equipe_id.cor,
      pontos_acumulados: equipeFinalPop.pontos_acumulados,
      coordenador: equipeFinalPop.coordenador_usuario_id, // objeto populado ou null
      total_membros: total_membros,
    };

    return res.status(200).json({ message: 'Coordenador atribuído/atualizado com sucesso.', equipe: equipeFormatada });

  } catch (error) {
    console.error('Erro ao atribuir coordenador:', error);
    return res.status(500).json({ message: 'Erro interno ao atribuir coordenador.', details: error.message });
  }
};

/**
 * [GET] Retorna as equipes para inscrição, marcando qual é a equipe atual do usuário
 */
export const listarEquipesParaInscricao = async (req, res) => {
  try {
    const meId = req.usuario.id;

    // Busca a equipe atual do usuário
    const membroAtual = await EquipeMembros.findOne({ usuario_id: meId });
    let equipeAtualId = null;

    if (membroAtual) {
      const equipeGincana = await EquipeGincana.findById(membroAtual.equipe_id);
      if (equipeGincana) {
        equipeAtualId = equipeGincana.equipe_id.toString();
      }
    }

    // Busca todas as equipes com seus dados
    const gincanaRecords = await EquipeGincana.find({ gincana_id: GINCANA_ATUAL_ID })
      .populate('equipe_id', 'nome cor')
      .populate('coordenador_usuario_id', 'nome email');

    const equipes = await Promise.all(gincanaRecords.map(async (rec) => {
      if (!rec.equipe_id) return null;

      const total_membros = await EquipeMembros.countDocuments({ equipe_id: rec._id });
      const isMinhaEquipe = equipeAtualId && rec.equipe_id._id.toString() === equipeAtualId;

      return {
        id: rec.equipe_id._id,
        nome: rec.equipe_id.nome,
        cor: rec.equipe_id.cor,
        pontos_acumulados: rec.pontos_acumulados,
        coordenador: rec.coordenador_usuario_id,
        total_membros: total_membros,
        isMinhaEquipe: isMinhaEquipe, // ✅ Marcador se é a equipe atual
      };
    }));

    res.status(200).json(equipes.filter(e => e !== null));
  } catch (error) {
    console.error('Erro ao listar equipes para inscrição:', error);
    res.status(500).json({ message: 'Erro interno ao listar equipes.' });
  }
};

/**
 * [GET] Lista usuários que são ALUNO ou COORDENADOR e que não pertencem a nenhuma equipe.
 */
export const listarUsuariosElegiveisCoordenador = async (req, res) => {
    try {
        console.log("Executando query para listar ALUNOS e COORDENADORES disponíveis...");
        const usuariosDisponiveis = await Usuario.aggregate([
            {
                // Passo 1: Filtrar pelos tipos de usuário desejados (ALUNO ou COORDENADOR)
                $match: {
                    tipo: { $in: ['ALUNO', 'COORDENADOR'] }
                }
            },
            {
                // Passo 2: Tentar encontrar um vínculo para cada usuário na tabela de membros
                $lookup: {
                    from: "Equipes_Membros",
                    localField: "_id",
                    foreignField: "usuario_id",
                    as: "vinculo_equipe"
                }
            },
            {
                // Passo 3: Filtrar, mantendo apenas os usuários onde o array 'vinculo_equipe' está VAZIO.
                // Isso garante que o usuário não está em nenhuma equipe.
                $match: {
                    vinculo_equipe: { $size: 0 }
                }
            },
            {
                // Passo 4: Formatar a saída
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
        console.error('ERRO FATAL na query de usuários disponíveis para equipe:', error);
        res.status(500).json({ message: 'Erro interno ao buscar usuários elegíveis.' });
    }
};