// src/pages/AdminEquipes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/Input';
import { Plus, Users, ArrowLeft, UserPlus, Zap, Trash2, Edit } from 'lucide-react'; 
import { toast } from '../components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { equipesService } from '../services/api'; 
import { useAuth } from '../hooks/useAuth.jsx';


const AdminEquipes = () => {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    
    const [equipes, setEquipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Listas de Usuários
    const [membrosDisponiveis, setMembrosDisponiveis] = useState([]);
    const [coordenadoresDisponiveis, setCoordenadoresDisponiveis] = useState([]);

    // Estado do formulário de CRIAÇÃO/EDIÇÃO
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEquipe, setEditingEquipe] = useState(null); 
    const [newEquipeData, setNewEquipeData] = useState({ 
        nome: '', 
        cor: '', 
    });

    // Estado do modal de VISUALIZAÇÃO
    const [membrosView, setMembrosView] = useState([]); 
    const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
    const [currentEquipe, setCurrentEquipe] = useState(null); 
    
    // Estado do modal de ADICIONAR MEMBRO
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState('');

    // NOVO ESTADO: Controle do Modal de Atribuição de Coordenador
    const [isSetCoordinatorOpen, setIsSetCoordinatorOpen] = useState(false);
    const [coordChangeEquipe, setCoordChangeEquipe] = useState(null);
    const [selectedNewCoordId, setSelectedNewCoordId] = useState('');

    
    // --- FUNÇÕES DE BUSCA ---
    const fetchCoordenadores = async () => {
        try {
            const usuarios = await equipesService.listarCoordenadoresDisponiveis(); 
            setCoordenadoresDisponiveis(usuarios.map(u => ({ 
                _id: u._id, 
                nome: `${u.nome}`
            })));
        } catch (error) {
            console.error('Erro ao carregar Coordenadores disponíveis:', error);
            setCoordenadoresDisponiveis([]);
        } 
    };

    const fetchMembros = async () => {
        try {
            const usuarios = await equipesService.listarMembrosDisponiveis(); 
            setMembrosDisponiveis(usuarios.map(u => ({ 
                _id: u._id, 
                nome: `${u.nome} (${u.tipo})` 
            })));
        } catch (error) {
            console.error('Erro ao carregar Membros Comuns disponíveis:', error);
            setMembrosDisponiveis([]);
        } 
    };

    const fetchEquipes = async () => {
        try {
            const data = await equipesService.listarEquipes();
            setEquipes(data);
        } catch (error) {
            toast.error('Erro ao carregar lista de equipes.');
            console.error('Erro na listagem de equipes:', error);
            setEquipes([]);
        }
    };

    // --- USE EFFECT ---
    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);
            await Promise.allSettled([
                fetchEquipes(),
                fetchMembros(),
                fetchCoordenadores(),
            ]);
            setIsLoading(false); 
        };

        loadAllData();
    }, [usuario]);


    // --- FUNÇÕES CRUD E LÓGICA DE ESTADO ---
    const handleOpenDialog = (equipe = null) => {
        setEditingEquipe(equipe);
        
        if (equipe) {
            setNewEquipeData({ 
                nome: equipe.nome, 
                cor: equipe.cor,
            });
        } else {
            setNewEquipeData({ nome: '', cor: '' });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingEquipe;
        const { nome, cor } = newEquipeData; 

        if (!nome || !cor) {
            toast.error('Nome e cor são obrigatórios.');
            return;
        }
        
        const dataToSend = { nome, cor };

        try {
            const response = isEditing 
                ? await equipesService.atualizarEquipe(editingEquipe.id || editingEquipe._id, dataToSend)
                : await equipesService.criarEquipe(dataToSend);

            const updatedEquipeId = response.equipe.id?.toString() || response.equipe._id?.toString(); 

            setEquipes(prev => isEditing 
                ? prev.map(e => {
                    const currentId = e.id?.toString() || e._id?.toString();
                    if (currentId === updatedEquipeId) {
                        return response.equipe; 
                    }
                    return e;
                })
                : [...prev, response.equipe]
            );
            
            toast.success(`Equipe ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
            setIsDialogOpen(false);

        } catch (error) {
            const msg = error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} equipe.`;
            toast.error(msg);
        }
    };


    // --- FUNÇÕES DE VISUALIZAÇÃO E DELEÇÃO ---
    const openViewMembersDialog = async (equipe) => {
        setCurrentEquipe(equipe);
        setMembrosView([]); 
        setIsViewMembersOpen(true);

        try {
            const equipeId = equipe.id || equipe._id;
            const membros = await equipesService.listarMembrosPorIdEquipe(equipeId); 
            setMembrosView(membros);
        } catch (error) {
            toast.error('Erro ao carregar detalhes dos membros da equipe.');
            console.error('Erro ao buscar membros para visualização:', error);
        }
    };
    
    const openAddMemberDialog = (equipe) => {
        setCurrentEquipe(equipe);
        setSelectedUsuarioId('');
        setIsAddMemberOpen(true);
    };

    const handleAddMember = async () => {
        if (!selectedUsuarioId || !currentEquipe) return;
        
        const equipeId = currentEquipe.id || currentEquipe._id;

        try {
            const response = await equipesService.adicionarMembro(equipeId, selectedUsuarioId);

            setEquipes((prevEquipes) => 
                prevEquipes.map((equipe) => {
                    if (equipe.id === equipeId || equipe._id === equipeId) {
                        return response.equipe; 
                    }
                    return equipe;
                })
            );
            
            setMembrosDisponiveis(prev => prev.filter(u => u._id !== selectedUsuarioId));
            
            toast.success('Participante adicionado com sucesso!');
            setIsAddMemberOpen(false);
        } catch (error) {
            const msg = error.message || 'Erro ao adicionar membro.';
            toast.error(msg);
        }
    };
    
    const handleDeleteEquipe = async (equipeId, equipeNome) => {
        if (!window.confirm(`Tem certeza que deseja excluir a equipe "${equipeNome}"? Esta ação é irreversível!`)) {
            return;
        }

        try {
            await equipesService.deletarEquipe(equipeId);

            setEquipes(prev => prev.filter(e => e.id !== equipeId && e._id !== equipeId));
            
            toast.success(`Equipe "${equipeNome}" excluída com sucesso!`);
            
            fetchMembros(); 
            fetchCoordenadores();
        } catch (error) {
            const msg = error.message || 'Erro ao excluir a equipe.';
            toast.error(msg);
        }
    };


    // --- FUNÇÕES DE ATRIBUIÇÃO DE COORDENADOR ---
    const openSetCoordinatorDialog = (equipe) => {
        setCoordChangeEquipe(equipe);
        const currentCoordId = equipe.coordenador 
            ? equipe.coordenador._id?.toString() || equipe.coordenador.id?.toString() 
            : ''; 
        setSelectedNewCoordId(currentCoordId);
        setIsSetCoordinatorOpen(true);
    };

    const handleSetCoordinator = async () => {
        if (!coordChangeEquipe) return;
        
        const equipeId = coordChangeEquipe.id || coordChangeEquipe._id;
        const coordId = selectedNewCoordId === '' ? null : selectedNewCoordId;

        try {
            const response = await equipesService.atribuirCoordenador(equipeId, coordId);

            setEquipes(prevEquipes => prevEquipes.map(e => 
                (e.id === equipeId || e._id === equipeId) ? response.equipe : e
            ));
            
            toast.success('Coordenador atribuído/trocado com sucesso.');
            setIsSetCoordinatorOpen(false);
            
            fetchCoordenadores(); 
            fetchMembros();
            
        } catch (error) {
            toast.error(error.message || 'Erro ao atribuir coordenador.');
        }
    };


    // --- RENDERIZAÇÃO ---
    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando gerenciamento de equipes...</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-900 hover:bg-gray-100">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Equipes</h1>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Equipes da Gincana</h2>
                        <p className="text-gray-600">Crie, coordene e gerencie os participantes das equipes</p>
                    </div>
                    
                    {/* Diálogo de Criação/Edição */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOpenDialog()}>
                                <Plus className="h-4 w-4 mr-2" /> Criar Nova Equipe
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>{editingEquipe ? 'Editar Equipe' : 'Criar Nova Equipe'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nome">Nome da Equipe</Label>
                                    <Input id="nome" value={newEquipeData.nome} onChange={(e) => setNewEquipeData({...newEquipeData, nome: e.target.value})} placeholder="Ex: Equipe Falcão" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cor">Cor (Código HEX)</Label>
                                    <Input id="cor" type="text" value={newEquipeData.cor} onChange={(e) => setNewEquipeData({...newEquipeData, cor: e.target.value})} placeholder="#33FF57" required />
                                </div>
                                <DialogFooter className="mt-4">
                                    <Button type="submit" className="bg-blue-600">
                                        {editingEquipe ? 'Salvar Alterações' : 'Criar Equipe'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Lista de Equipes */}
                <div className="grid gap-6">
                    {equipes.length > 0 ? (
                        equipes.map((equipe) => (
                            <Card key={equipe.id || equipe._id} className="shadow-md border-purple-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full border-2 border-gray-200" style={{ backgroundColor: equipe.cor || '#ccc' }}></div>
                                        <CardTitle className="text-xl">{equipe.nome}</CardTitle>
                                    </div>
                                    <div className="text-right">
                                        <CardDescription>
                                            <Zap className='inline h-4 w-4 mr-1 text-yellow-600'/> Pontos: {equipe.pontos_acumulados || 0}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2 flex items-center justify-between">
                                    <div className="text-sm text-gray-700 flex items-center gap-3">
                                        <Users className='inline h-4 w-4 mr-1 text-gray-500'/> 
                                        Coordenador: {equipe.coordenador?.nome || 'Não definido'}
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            className="text-gray-600 hover:bg-gray-100"
                                            onClick={() => openViewMembersDialog(equipe)}
                                        >
                                            Ver Membros ({equipe.total_membros || 0})
                                        </Button>
                                    </div>
                                    
                                    <div className="flex gap-2"> 
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-gray-600 hover:bg-gray-100" 
                                            onClick={() => handleOpenDialog(equipe)} 
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>

                                        {/* NOVO BOTÃO: Trocar Coordenador */}
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                            onClick={() => openSetCoordinatorDialog(equipe)} 
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            {equipe.coordenador ? 'Trocar Coordenador' : 'Atribuir Coordenador'}
                                        </Button>
                                        
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-red-600 hover:bg-red-50" 
                                            onClick={() => handleDeleteEquipe(equipe.id || equipe._id, equipe.nome)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => openAddMemberDialog(equipe)}>
                                            <UserPlus className="h-4 w-4 mr-2" /> Adicionar Membro
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="text-center p-10 mt-10">
                            <CardTitle className="text-gray-600">Nenhuma equipe encontrada.</CardTitle>
                            <CardDescription className="mt-2">Use o botão "Criar Nova Equipe" para começar.</CardDescription>
                        </Card>
                    )}
                </div>

                {/* Diálogo de Atribuir/Trocar Coordenador */}
                <Dialog open={isSetCoordinatorOpen} onOpenChange={setIsSetCoordinatorOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>
                                {coordChangeEquipe?.coordenador 
                                    ? `Trocar Coordenador da Equipe ${coordChangeEquipe?.nome}`
                                    : `Atribuir Coordenador à Equipe ${coordChangeEquipe?.nome}`}
                            </DialogTitle>
                            <DialogDescription>
                                Selecione o coordenador desejado entre os usuários disponíveis.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="coordenador">Selecionar Coordenador</Label>
                                <Select
                                    onValueChange={setSelectedNewCoordId}
                                    value={selectedNewCoordId}
                                    disabled={coordenadoresDisponiveis.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            coordenadoresDisponiveis.length === 0
                                                ? "Nenhum coordenador disponível"
                                                : "Selecione um coordenador"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {coordenadoresDisponiveis.map(coord => (
                                            <SelectItem key={coord._id} value={coord._id}>
                                                {coord.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                onClick={handleSetCoordinator} 
                                disabled={!selectedNewCoordId}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Confirmar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Diálogo de Visualização de Membros */}
                <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Membros da Equipe: {currentEquipe?.nome}</DialogTitle>
                            <DialogDescription>
                                Total de Participantes: {membrosView.length}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {membrosView.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Nenhum membro encontrado.</p>
                            ) : (
                                membrosView.map(membro => (
                                    <div key={membro.id} className="flex items-center justify-between p-3 border rounded-md shadow-sm">
                                        <div>
                                            <p className="font-semibold text-gray-800">{membro.nome}</p>
                                            <p className="text-sm text-gray-500">{membro.email} - ({membro.tipo})</p>
                                        </div>
                                        {membro.isCoordenador && (
                                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                Coordenador
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsViewMembersOpen(false)}>Fechar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Diálogo de Adicionar Membro */}
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Participante</DialogTitle>
                            <DialogDescription>
                                Adicione um usuário disponível à equipe {currentEquipe?.nome}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="usuarioId">Selecionar Usuário</Label>
                                <Select onValueChange={setSelectedUsuarioId} value={selectedUsuarioId} disabled={membrosDisponiveis.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={membrosDisponiveis.length === 0 ? "Nenhum usuário disponível" : "Selecione um usuário"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {membrosDisponiveis.map(user => (
                                            <SelectItem key={user._id} value={user._id}>{user.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddMember} disabled={!selectedUsuarioId} className="bg-blue-600">
                                Adicionar à Equipe
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
};

export default AdminEquipes;