import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Componentes da UI
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Loader, Trash2, Check, X, Home, ArrowLeft, UserPlus, User } from 'lucide-react';
import { equipesService } from '../services/api';

const GerenciarEquipe = () => {
  const navigate = useNavigate();

  const [equipeInfo, setEquipeInfo] = useState(null);
  const [membros, setMembros] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isRemoveMemberOpen, setIsRemoveMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const openRemoveMemberDialog = (membro) => {
    setMemberToRemove(membro); // Guarda o objeto do membro para usar depois
    setIsRemoveMemberOpen(true); // Abre o modal de confirmação
};

  useEffect(() => {
    const fetchMinhaEquipe = async () => {
      try {
        const data = await equipesService.visualizarMinhaEquipe();

        setEquipeInfo(data.equipeInfo);
        setMembros(data.membros);
        
      } catch (error) {
        console.error("Erro ao carregar dados da equipe:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMinhaEquipe();
  }, []);

  const handleAceitarSolicitacao = (inscricaoId) => {
    const solicitacaoAceita = solicitacoes.find(s => s._id === inscricaoId);
    if (solicitacaoAceita) {
      setMembros([...membros, solicitacaoAceita.usuario_id]);
      setSolicitacoes(solicitacoes.filter(s => s._id !== inscricaoId));
    }
  };

  const handleRejeitarSolicitacao = (inscricaoId) => {
    setSolicitacoes(solicitacoes.filter(s => s._id !== inscricaoId));
  };
  
  const handleRemoverMembro = async () => {
    // Pega o ID do estado, em vez de um argumento
    if (!memberToRemove) return;
    const membroId = memberToRemove._id;

    try {
        await equipesService.removerMembroMinhaEquipe(membroId);

        // Atualiza a lista de membros na tela
        setMembros(membrosAtuais => membrosAtuais.filter(membro => membro._id !== membroId));
        
        // (Opcional) Mostra uma notificação de sucesso
        // toast.success(`"${memberToRemove.nome}" foi removido da equipe.`);

    } catch (error) {
        console.error("Erro ao remover membro:", error);
        // (Opcional) Mostra uma notificação de erro
        // toast.error(error.message || "Falha ao remover membro.");
    } finally {
        // Limpa o estado e fecha o modal, independentemente do resultado
        setIsRemoveMemberOpen(false);
        setMemberToRemove(null);
    }
};

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-900 hover:bg-gray-100">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Equipes</h1>
                </div>
            </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Equipe: {equipeInfo?.nome}</h2>
          <p className="text-gray-600">Visualize os membros atuais.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Card de Membros da Equipe */}
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Membros da Equipe</CardTitle>
              <CardDescription className="text-gray-600">
                Visualize os participantes da sua equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {membros.length > 0 ? (
                membros.map((membro) => (
                  <div key={membro._id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                     <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-full border">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{membro.usuario_id?.nome || '—'}</p>
                        <p className="text-sm text-gray-600">{membro.usuario_id?.email || '—'}</p>
                      </div>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => openRemoveMemberDialog(membro)}>
                        <Trash2 size={16} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-6">Nenhum membro na equipe ainda.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog open={isRemoveMemberOpen} onOpenChange={setIsRemoveMemberOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirmar Remoção</DialogTitle>
                    <DialogDescription>
                        Você tem certeza que deseja remover o participante 
                        <span className="font-bold text-red-600"> {memberToRemove?.usuario_id?.nome || memberToRemove?.nome} </span> 
                        da sua equipe?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsRemoveMemberOpen(false)}>
                        Cancelar
                    </Button>
                    {/* Este botão agora chama a nova função handleRemoverMembro */}
                    <Button variant="destructive" onClick={handleRemoverMembro}>
                        Sim, Remover
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default GerenciarEquipe;