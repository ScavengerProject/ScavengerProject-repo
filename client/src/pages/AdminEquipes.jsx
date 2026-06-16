import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Plus, Users, ArrowLeft, UserPlus, Zap, Trash2, Edit } from 'lucide-react'; 
import { toast } from '../components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { equipesService } from '../services/api'; 
import { useAuth } from '../hooks/useAuth.jsx';
import MainLayout from '../components/MainLayout';


const AdminEquipes = () => {
    const navigate = useNavigate();
    const { usuario, logout } = useAuth();
    
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

    // Estado do modal de CONFIRMAÇÃO DE EXCLUSÃO
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [equipeToDelete, setEquipeToDelete] = useState(null);
    
    // Estado do modal de ADICIONAR MEMBRO
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState('');

    // Controle do Modal de Gestão de Coordenadores (múltiplos)
    const [isSetCoordinatorOpen, setIsSetCoordinatorOpen] = useState(false);
    const [coordChangeEquipe, setCoordChangeEquipe] = useState(null);
    const [selectedNewCoordId, setSelectedNewCoordId] = useState('');
    const [maxCoordInput, setMaxCoordInput] = useState(1);

    
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
            // A API de adicionarMembro retorna apenas { message, membro }, não a equipe completa.
            // Atualizamos o contador de membros localmente para refletir a adição sem quebrar o estado.
            await equipesService.adicionarMembro(equipeId, selectedUsuarioId);

            setEquipes((prevEquipes) =>
                prevEquipes.map((equipe) => {
                    if (equipe.id === equipeId || equipe._id === equipeId) {
                        return { ...equipe, total_membros: (equipe.total_membros || 0) + 1 };
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

    const isColorDark = (hex) => {
        const color = hex.replace('#', '');
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        // Fórmula de luminância percebida
        return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    };
    
    const openDeleteDialog = (equipe) => {
        setEquipeToDelete(equipe);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteEquipe = async () => {
        if (!equipeToDelete) return;
        const equipeId = equipeToDelete.id || equipeToDelete._id;

        try {
            await equipesService.deletarEquipe(equipeId);
            setEquipes(prev => prev.filter(e => e.id !== equipeId && e._id !== equipeId));
            toast.success(`Equipe "${equipeToDelete.nome}" excluída com sucesso!`);
            fetchMembros();
            fetchCoordenadores();
        } catch (error) {
            toast.error(error.message || 'Erro ao excluir a equipe.');
        } finally {
            setIsDeleteDialogOpen(false);
            setEquipeToDelete(null);
        }
    };


    // --- FUNÇÕES DE GESTÃO DE COORDENADORES (MÚLTIPLOS) ---
    const carregarElegiveis = async (equipeId) => {
        try {
            const usuarios = await equipesService.listarElegiveisParaCoordenador(equipeId);
            setCoordenadoresDisponiveis(usuarios.map(u => ({
                _id: u._id,
                nome: `${u.nome} (${u.tipo})`,
            })));
        } catch (error) {
            console.error('Erro ao carregar coordenadores elegíveis:', error);
            toast.error(`Erro ao carregar lista de usuários: ${error.message}`);
            setCoordenadoresDisponiveis([]);
        }
    };

    const openManageCoordinatorsDialog = async (equipe) => {
        setCoordChangeEquipe(equipe);
        setSelectedNewCoordId('');
        setMaxCoordInput(equipe.max_coordenadores ?? 1);
        const equipeId = equipe.id || equipe._id;
        await carregarElegiveis(equipeId);
        setIsSetCoordinatorOpen(true);
    };

    // Sincroniza o estado da lista e o snapshot do modal após uma operação.
    const aplicarEquipeAtualizada = (equipeId, equipeAtualizada) => {
        setEquipes(prevEquipes => prevEquipes.map(e =>
            (e.id === equipeId || e._id === equipeId) ? equipeAtualizada : e
        ));
        setCoordChangeEquipe(equipeAtualizada);
    };

    const handleAddCoordinator = async () => {
        if (!coordChangeEquipe || !selectedNewCoordId) return;
        const equipeId = coordChangeEquipe.id || coordChangeEquipe._id;

        try {
            const response = await equipesService.adicionarCoordenador(equipeId, selectedNewCoordId);
            aplicarEquipeAtualizada(equipeId, response.equipe);
            toast.success('Coordenador adicionado com sucesso.');
            setSelectedNewCoordId('');
            await carregarElegiveis(equipeId);
            fetchCoordenadores();
            fetchMembros();
        } catch (error) {
            toast.error(error.message || 'Erro ao adicionar coordenador.');
        }
    };

    const handleRemoveCoordinator = async (usuarioId) => {
        if (!coordChangeEquipe || !usuarioId) return;
        const equipeId = coordChangeEquipe.id || coordChangeEquipe._id;

        try {
            const response = await equipesService.removerCoordenador(equipeId, usuarioId);
            aplicarEquipeAtualizada(equipeId, response.equipe);
            toast.success('Coordenador removido com sucesso.');
            await carregarElegiveis(equipeId);
            fetchCoordenadores();
            fetchMembros();
        } catch (error) {
            toast.error(error.message || 'Erro ao remover coordenador.');
        }
    };

    const handleSaveMaxCoordenadores = async () => {
        if (!coordChangeEquipe) return;
        const equipeId = coordChangeEquipe.id || coordChangeEquipe._id;

        try {
            const response = await equipesService.atualizarMaxCoordenadores(equipeId, Number(maxCoordInput));
            aplicarEquipeAtualizada(equipeId, response.equipe);
            toast.success('Limite de coordenadores atualizado.');
        } catch (error) {
            toast.error(error.message || 'Erro ao atualizar limite de coordenadores.');
        }
    };


    // --- RENDERIZAÇÃO ---
    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando gerenciamento de equipes...</div>;
    }

    return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
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
                                    <Label htmlFor="cor">Cor da Equipe</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="cor"
                                            type="color"
                                            value={newEquipeData.cor || '#3b82f6'}
                                            onChange={(e) => setNewEquipeData({...newEquipeData, cor: e.target.value})}
                                            className="h-10 w-14 rounded-md border border-input cursor-pointer p-1"
                                            required
                                        />
                                        <div
                                            className="flex-1 h-10 rounded-md border border-gray-200 flex items-center px-3 gap-2"
                                            style={{ backgroundColor: newEquipeData.cor || '#3b82f6' }}
                                        >
                                            <span
                                                className="text-xs font-mono font-semibold drop-shadow"
                                                style={{ color: isColorDark(newEquipeData.cor || '#3b82f6') ? '#fff' : '#000' }}
                                            >
                                                {newEquipeData.cor || '#3b82f6'}
                                            </span>
                                        </div>
                                    </div>
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
                            <Card key={equipe.id || equipe._id} id={`card-equipe-${equipe.id || equipe._id}`} className="shadow-md border-purple-200">
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-6 rounded-full border-2 border-gray-200 shrink-0" style={{ backgroundColor: equipe.cor || '#ccc' }}></div>
                                        <CardTitle className="text-lg sm:text-xl break-words">{equipe.nome}</CardTitle>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <CardDescription className="text-sm">
                                            <Zap className='inline h-4 w-4 mr-1 text-yellow-600'/> Pontos: {equipe.pontos_acumulados || 0}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2 flex flex-col gap-4">
                                    <div className="text-sm text-gray-700 flex flex-wrap items-center gap-2 sm:gap-3">
                                        <Users className='inline h-4 w-4 text-gray-500'/>
                                        <span className="break-words">
                                            {(equipe.coordenadores && equipe.coordenadores.length > 0)
                                                ? `Coordenadores: ${equipe.coordenadores.map(c => c.nome).join(', ')}`
                                                : 'Coordenadores: Não definido'}
                                            <span className="text-gray-400 ml-1">
                                                ({(equipe.coordenadores?.length || 0)}/{equipe.max_coordenadores ?? 1})
                                            </span>
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-gray-600 hover:bg-gray-100 text-xs"
                                            onClick={() => openViewMembersDialog(equipe)}
                                        >
                                            Ver Membros ({equipe.total_membros || 0})
                                        </Button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2"> 
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-gray-600 hover:bg-gray-100 text-xs" 
                                            onClick={() => handleOpenDialog(equipe)} 
                                        >
                                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>

                                        {/* Gerenciar coordenadores (múltiplos) */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-purple-600 border-purple-300 hover:bg-purple-50 text-xs"
                                            onClick={() => openManageCoordinatorsDialog(equipe)}
                                        >
                                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            <span className="hidden sm:inline">Gerenciar Coord.</span>
                                            <span className="sm:hidden">Coord.</span>
                                        </Button>
                                        
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs" 
                                            onClick={() => openDeleteDialog(equipe)}
                                        >
                                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                        
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            id="btnAddMember"
                                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs" 
                                            onClick={() => openAddMemberDialog(equipe)}
                                        >
                                            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            <span className="hidden sm:inline">Adicionar</span>
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

                {/* Diálogo de Gestão de Coordenadores (múltiplos) */}
                <Dialog open={isSetCoordinatorOpen} onOpenChange={setIsSetCoordinatorOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Gerenciar Coordenadores — {coordChangeEquipe?.nome}</DialogTitle>
                            <DialogDescription>
                                Defina o limite máximo e quais usuários são coordenadores desta equipe.
                                Todos os coordenadores têm os mesmos poderes.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 py-2">
                            {/* Limite máximo */}
                            <div className="grid gap-2">
                                <Label htmlFor="max-coord">Número máximo de coordenadores</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="max-coord"
                                        type="number"
                                        min={1}
                                        value={maxCoordInput}
                                        onChange={(e) => setMaxCoordInput(e.target.value)}
                                        className="w-24"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSaveMaxCoordenadores}
                                    >
                                        Salvar limite
                                    </Button>
                                </div>
                            </div>

                            {/* Coordenadores atuais */}
                            <div className="grid gap-2">
                                <Label>
                                    Coordenadores atuais ({coordChangeEquipe?.coordenadores?.length || 0}/{coordChangeEquipe?.max_coordenadores ?? 1})
                                </Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {(coordChangeEquipe?.coordenadores?.length || 0) === 0 ? (
                                        <p className="text-sm text-gray-500">Nenhum coordenador definido.</p>
                                    ) : (
                                        coordChangeEquipe.coordenadores.map((coord) => (
                                            <div key={coord.id} className="flex items-center justify-between p-2 border rounded-md">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{coord.nome}</p>
                                                    <p className="text-xs text-gray-500 truncate">{coord.email}</p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-600 hover:bg-red-50 shrink-0"
                                                    onClick={() => handleRemoveCoordinator(coord.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Adicionar coordenador */}
                            <div className="grid gap-2">
                                <Label htmlFor="add-coord">Adicionar coordenador</Label>
                                {(coordChangeEquipe?.coordenadores?.length || 0) >= (coordChangeEquipe?.max_coordenadores ?? 1) ? (
                                    <p className="text-sm text-amber-600">
                                        Limite máximo atingido. Aumente o limite ou remova um coordenador para adicionar outro.
                                    </p>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Select
                                            onValueChange={setSelectedNewCoordId}
                                            value={selectedNewCoordId}
                                            disabled={coordenadoresDisponiveis.length === 0}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder={
                                                    coordenadoresDisponiveis.length === 0
                                                        ? "Nenhum usuário disponível"
                                                        : "Selecione um usuário"
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
                                        <Button
                                            onClick={handleAddCoordinator}
                                            disabled={!selectedNewCoordId}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-1" /> Adicionar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSetCoordinatorOpen(false)}>Fechar</Button>
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

                {/* Diálogo de Confirmação de Exclusão */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="h-5 w-5" />
                                Excluir Equipe
                            </DialogTitle>
                            <DialogDescription className="pt-2">
                                Tem certeza que deseja excluir a equipe{' '}
                                <span className="font-semibold text-gray-800">"{equipeToDelete?.nome}"</span>?
                                <br />
                                <span className="text-red-500 text-sm mt-1 block">Esta ação é irreversível e removerá todos os dados da equipe.</span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleDeleteEquipe}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Sim, excluir
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default AdminEquipes;