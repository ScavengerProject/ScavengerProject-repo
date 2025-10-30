import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/Input';
import { Plus, Users, ArrowLeft, UserPlus, Zap } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { equipesService } from '../services/api'; 
import { useAuth } from '../hooks/useAuth.jsx';


const AdminEquipes = () => {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    
    const [equipes, setEquipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [coordenadoresDisponiveis, setCoordenadoresDisponiveis] = useState([]);
    
    const [membrosDisponiveis, setMembrosDisponiveis] = useState([]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEquipeData, setNewEquipeData] = useState({ 
        nome: '', 
        cor: '', 
        coordenador_usuario_id: '' 
    });
    
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [currentEquipe, setCurrentEquipe] = useState(null);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
    

    useEffect(() => {
        const fetchEquipes = async () => {
            try {
                setIsLoading(true);
                const data = await equipesService.listarEquipes();
                setEquipes(data);
            } catch (error) {
                toast.error('Erro ao carregar lista de equipes.');
                console.error('Erro na listagem de equipes:', error);
            }
        };
        
        const fetchCoordenadores = async () => {
            try {
                const usuarios = await equipesService.listarCoordenadoresDisponiveis(); 
                setCoordenadoresDisponiveis(usuarios.map(u => ({ 
                    _id: u._id, 
                    nome: `${u.nome}`
                })));
            } catch (error) {
                console.error('Erro ao carregar Coordenadores disponíveis:', error);
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
            } finally {
                setIsLoading(false);
            }
        };

        fetchEquipes();
        fetchCoordenadores();
        fetchMembros();

    }, [usuario]);

    const handleCreateEquipe = async (e) => {
        e.preventDefault();
        const { nome, cor, coordenador_usuario_id } = newEquipeData;

        if (!nome || !cor || !coordenador_usuario_id) {
            toast.error('Preencha nome, cor e selecione o coordenador.');
            return;
        }

        try {
            const response = await equipesService.criarEquipe(newEquipeData);
            
            setEquipes((prev) => [...prev, response.equipe]); 
            toast.success(`Equipe "${response.equipe.nome}" criada com sucesso!`);
            
            setIsDialogOpen(false);
            setNewEquipeData({ nome: '', cor: '', coordenador_usuario_id: usuario?.id || '' });
            
            setCoordenadoresDisponiveis(prev => prev.filter(c => c._id !== coordenador_usuario_id));

        } catch (error) {
            const msg = error.message || 'Erro desconhecido ao criar equipe.';
            toast.error(msg);
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

            setEquipes((prev) => 
                prev.map((e) => 
                    e._id === equipeId || e.id === equipeId
                        ? { ...e, 
                            membros: response.equipe.membros,
                            total_membros: response.equipe.membros.length
                          } 
                        : e
                )
            );
            
            setMembrosDisponiveis(prev => prev.filter(u => u._id !== selectedUsuarioId));
            
            toast.success('Participante adicionado com sucesso!');
            setIsAddMemberOpen(false);
        } catch (error) {
            const msg = error.message || 'Erro ao adicionar membro.';
            toast.error(msg);
        }
    };
    
    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando gerenciamento de equipes...</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-900 hover:bg-gray-100">
                        <ArrowLeft className="h-4 w-4 mr-2" />
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
                    
                    {/* Diálogo de Criação de Equipe */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4 mr-2" /> Criar Nova Equipe
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>Criar Nova Equipe</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateEquipe} className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nome">Nome da Equipe</Label>
                                    <Input id="nome" value={newEquipeData.nome} onChange={(e) => setNewEquipeData({...newEquipeData, nome: e.target.value})} placeholder="Ex: Equipe Falcão" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cor">Cor (Código HEX, ex: #FF33A1)</Label>
                                    <Input id="cor" type="text" value={newEquipeData.cor} onChange={(e) => setNewEquipeData({...newEquipeData, cor: e.target.value})} placeholder="#33FF57" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="coordenador">Coordenador</Label>
                                    <Select onValueChange={(value) => setNewEquipeData({...newEquipeData, coordenador_usuario_id: value})} value={newEquipeData.coordenador_usuario_id} disabled={coordenadoresDisponiveis.length === 0}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={coordenadoresDisponiveis.length === 0 ? "Nenhum coordenador livre" : "Selecione o Coordenador"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {coordenadoresDisponiveis.map(coord => (
                                                <SelectItem key={coord._id} value={coord._id}>{coord.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter className="mt-4">
                                    <Button type="submit" disabled={coordenadoresDisponiveis.length === 0} className="bg-blue-600">Criar Equipe</Button>
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
                                    <div className="text-sm text-gray-700">
                                        <Users className='inline h-4 w-4 mr-1 text-gray-500'/> Membros: {equipe.total_membros || 0} | Coordenador: {equipe.coordenador?.nome || 'Não definido'}
                                    </div>
                                    
                                    {/* Ação de Adicionar Membro (US06) */}
                                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => openAddMemberDialog(equipe)}>
                                        <UserPlus className="h-4 w-4 mr-2" /> Adicionar Membro
                                    </Button>
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
                
                {/* Diálogo de Adicionar Membro (US06) */}
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
                                {/* Fonte de dados alterada para MEMBROS DISPONÍVEIS */}
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