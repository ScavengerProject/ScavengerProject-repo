import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';
import { feedbacksService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, MessageSquare, Reply, Clock, CheckCircle } from 'lucide-react';
import { toast } from '../components/ui/toast'; // Para notificações

const getStatusColor = (status) => {
    switch (status) {
        case 'PENDENTE': return 'bg-yellow-100 text-yellow-800';
        case 'ANALISADO': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const AdminFeedbacks = () => {
    const navigate = useNavigate();
    const { usuario, logout } = useAuth();
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados do Modal de Resposta
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState(null);
    const [resposta, setResposta] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchFeedbacks = async () => {
        try {
            const data = await feedbacksService.listarFeedbacks();
            setFeedbacks(data);
        } catch (error) {
            toast.error('Erro ao carregar feedbacks.');
            console.error('Erro na listagem de feedbacks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const openResponseModal = (feedback) => {
        setCurrentFeedback(feedback);
        setResposta(feedback.resposta_admin || ''); // Preenche se já houver resposta
        setIsResponseModalOpen(true);
    };

    const handleResponder = async (e) => {
        e.preventDefault();
        if (!currentFeedback || !resposta.trim()) {
            toast.error('A resposta não pode ser vazia.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await feedbacksService.responderFeedback(currentFeedback._id, resposta);
            
            // Atualiza o feedback na lista local
            setFeedbacks(prev => prev.map(f => f._id === currentFeedback._id ? response.feedback : f));
            
            toast.success('Feedback respondido com sucesso!');
            setIsResponseModalOpen(false);

        } catch (error) {
            toast.error(error.message || 'Falha ao enviar a resposta.');
            console.error('Erro ao responder feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando feedbacks...</div>;
    }

    return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                <p className="text-gray-600 mb-6">Analise e responda os feedbacks e relatos de problemas dos usuários.</p>

                <div className="grid gap-6">
                    {feedbacks.length === 0 && <p className="text-center text-gray-500">Nenhum feedback encontrado.</p>}

                    {feedbacks.map((feedback) => (
                        <Card key={feedback._id} className="shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-lg">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(feedback.status)}`}>
                                        {feedback.status}
                                    </span>
                                </CardTitle>
                                <div className="text-right text-sm text-gray-500">
                                    <p className="font-medium">{feedback.criado_por_usuario_id?.nome || 'Usuário Desconhecido'}</p>
                                    <p className="text-xs">Enviado em: {new Date(feedback.criado_em).toLocaleDateString()}</p>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-2">
                                <p className="mb-4 whitespace-pre-wrap text-gray-800 border-l-4 border-gray-200 pl-3">{feedback.descricao}</p>

                                {feedback.resposta_admin && (
                                    <div className="bg-blue-50 p-3 rounded-lg mt-3 border border-blue-200">
                                        <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
                                            <CheckCircle className='w-3 h-3 mr-1'/> Resposta do Admin ({feedback.avaliado_por_usuario_id?.nome}):
                                        </p>
                                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{feedback.resposta_admin}</p>
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                    <Button 
                                        size="sm" 
                                        onClick={() => openResponseModal(feedback)}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Reply className="w-4 h-4 mr-2" /> 
                                        {feedback.status === 'ANALISADO' ? 'Ver/Editar Resposta' : 'Responder Feedback'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

            {/* Modal de Resposta do Administrador */}
            <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Responder Feedback</DialogTitle>
                        <DialogDescription>
                            Feedback de <span className="font-semibold">{currentFeedback?.criado_por_usuario_id?.nome || 'Usuário'}</span>:
                            <div className='mt-2 p-2 bg-gray-100 rounded-md border border-gray-300 max-h-32 overflow-y-auto text-sm text-gray-700'>
                                {currentFeedback?.descricao}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResponder}>
                        <div className="grid gap-2">
                            <Label htmlFor="resposta">Sua Resposta (Máx. 10000 caracteres)</Label>
                            <Textarea
                                id="resposta"
                                value={resposta}
                                onChange={(e) => setResposta(e.target.value)}
                                placeholder="Detalhe as ações tomadas ou o motivo da decisão."
                                rows={6}
                                required
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={isSubmitting || resposta.length < 10}>
                                {isSubmitting ? 'Enviando...' 
                                    : (currentFeedback?.status !== 'PENDENTE' 
                                        ? 'Salvar Edição da Resposta' 
                                        : 'Responder e Marcar como Finalizado')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminFeedbacks;