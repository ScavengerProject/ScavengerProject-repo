import Equipe from '../models/Equipe.js';
import EquipeGincana from '../models/EquipeGincana.js';
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
        if (coordenador.equipe_id) {
            return res.status(409).json({ message: 'Coordenador já pertence a outra equipe.' });
        }
        
        // Cria a equipe
        const novaEquipe = new Equipe({
            nome,
            cor,
            membros: [coordenador_usuario_id], // O coordenador é o primeiro membro
        });
        const equipeSalva = await novaEquipe.save();
        
        // Cria o registro contextual (EquipeGincana)
        const equipeGincanaSalva = await EquipeGincana.create({
            equipe_id: equipeSalva._id,
            coordenador_usuario_id,
            gincana_id: GINCANA_ATUAL_ID,
        });

        // Liga a equipe ao coordenador (pelo Usuario.js)
        coordenador.equipe_id = equipeSalva._id;
        await coordenador.save();

        res.status(201).json({ 
            message: 'Equipe e cordenador associado, criados com sucesso.', 
            equipe: { 
                ...equipeSalva.toObject(), 
                pontos_acumulados: equipeGincanaSalva.pontos_acumulados 
            }
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
        // busca todos os registros contextuais (equipeGincana) da Gincana ATUAL
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


        res.status(200).json(equipes);
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
        const { id } = req.params; // ID da Equipe (Equipe._id)
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
        const usuarios = await Usuario.find({ 
            equipe_id: null,
            tipo: 'COORDENADOR' // Filtra só os coordenadores
        })
        .select('nome email tipo turma'); 


        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Erro ao listar coordenadores disponíveis:', error);
        res.status(500).json({ message: 'Erro interno ao buscar coordenadores disponíveis.' });
    }
};

/**
 * [GET] Lista usuários que NÃO estão em nenhuma equipe e SÃO ELEGÍVEIS para serem membros comuns (exclui ADMIN e COORDENADOR)
 */
export const listarUsuariosSemEquipe = async (req, res) => {
    try {
        console.log("Executando query para Membros Comuns disponíveis..."); 
        
        const usuarios = await Usuario.find({ 
            equipe_id: null,
            tipo: { $nin: ['ADMIN', 'COORDENADOR'] }
        })
        .select('nome email tipo turma'); 

        console.log(`Encontrados ${usuarios.length} usuários disponíveis.`);
        
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('ERRO FATAL na query de usuários disponíveis:', error); 
        res.status(500).json({ message: 'Erro interno ao buscar usuários disponíveis.' });
    }
};