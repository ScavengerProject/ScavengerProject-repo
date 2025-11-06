// src/pages/MeusFeedbacks.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbacksService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, Send } from 'lucide-react';

const getStatusColor = (status) => {
    switch (status) {
        case 'PENDENTE': return 'text-yellow-800 bg-yellow-100';
        case 'RESPONDIDO': return 'text-green-800 bg-green-100';
        default: return 'text-gray-800 bg-gray-100';
    }
};

const MeusFeedbacks = () => {
    const navigate = useNavigate();
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMeusFeedbacks = async () => {
        try {
            // ✅ Nova função de serviço: listarMeusFeedbacks (precisa ser adicionada ao api.js)
            const data = await feedbacksService.listarMeusFeedbacks(); 
            setFeedbacks(data);
        } catch (error) {
            console.error('Erro ao carregar meus feedbacks:', error);
            // toast.error('Erro ao carregar seu histórico de feedbacks.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeusFeedbacks();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando seu histórico de feedbacks...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-900 hover:bg-gray-100">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Meu Histórico de Feedbacks</h1>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <p className="text-gray-600 mb-6">Acompanhe o status e as respostas dos feedbacks que você enviou.</p>

                <div className="grid gap-6">
                    {feedbacks.length === 0 && (
                        <Card className="text-center p-8">
                            <CardTitle className="text-xl text-gray-700">Nenhum feedback enviado ainda.</CardTitle>
                            <CardDescription className="mt-2">Use o botão flutuante para enviar seu primeiro relato.</CardDescription>
                        </Card>
                    )}

                    {feedbacks.map((feedback) => (
                        <Card key={feedback._id} className="shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-lg flex items-center">
                                    <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                                    Relato Enviado
                                </CardTitle>
                                <div className="text-right text-sm text-gray-500">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(feedback.status)}`}>
                                        {feedback.status}
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-2">
                                {/* Descrição Original */}
                                <p className="mb-4 whitespace-pre-wrap text-gray-800 border-l-4 border-gray-200 pl-3 italic">{feedback.descricao}</p>

                                {/* Resposta do Admin */}
                                {feedback.resposta_admin && (
                                    <div className="bg-green-50 p-3 rounded-lg mt-3 border border-green-200">
                                        <p className="text-xs font-semibold text-green-700 mb-1 flex items-center">
                                            <Send className='w-3 h-3 mr-1'/> Resposta da Administração ({feedback.avaliado_por_usuario_id?.nome || 'Gestor'}):
                                        </p>
                                        <p className="text-sm text-green-900 whitespace-pre-wrap">{feedback.resposta_admin}</p>
                                    </div>
                                )}
                                
                                {/* Status de tempo */}
                                <p className="text-xs text-gray-400 mt-2 flex items-center justify-end">
                                    <Clock className='w-3 h-3 mr-1' /> Enviado em: {new Date(feedback.criado_em).toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default MeusFeedbacks;