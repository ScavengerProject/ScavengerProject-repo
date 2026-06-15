import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
// Componentes da UI
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Loader, Trash2, Check, X, Home, ArrowLeft, UserPlus, User } from 'lucide-react';
import { equipesService } from '../services/api';

const GerenciarEquipe = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

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
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{membro.usuario_id?.nome || '—'}</p>
                          {membro.is_coordenador && (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              Coordenador
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{membro.usuario_id?.email || '—'}</p>
                      </div>
                    </div>
                    {!membro.is_coordenador && (
                      <Button variant="destructive" size="icon" onClick={() => openRemoveMemberDialog(membro)}>
                          <Trash2 size={16} />
                      </Button>
                    )}
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
      </div>
    </MainLayout>
  );
};

export default GerenciarEquipe;