import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { CheckCircle2, User, Users, Star } from 'lucide-react';
import { Button } from './ui/button';
import { equipesService } from '../services/api';

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';

const SkeletonLoader = () => (
  <div className="h-8 bg-gray-200 rounded-md animate-pulse w-full"></div>
);

const InfosEquipeModal = ({ equipe, isOpen, onClose }) => {
    const equipeCor = equipe?.cor || '#3b82f6'; 

    const [membros, setMembros] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchMembros = async () => {
            if (isOpen && equipe?.id) {
                try {
                    setIsLoading(true);
                    const data = await equipesService.listarMembrosPorIdEquipe(equipe.id);
                    const sortedData = data.sort((a, b) => b.isCoordenador - a.isCoordenador);
                    setMembros(sortedData);
                } catch (error) {
                    console.error("Erro ao carregar membros:", error);
                    setMembros([]);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (isOpen) {
            fetchMembros();
        } else {
            setMembros([]);
        }
    }, [isOpen, equipe]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-0">
                <DialogHeader 
                    className="p-6 pb-4 rounded-t-lg"
                >
                    <DialogTitle className="text-2xl font-bold flex items-center text-gray-900">
                        <CheckCircle2 className="h-6 w-6 mr-2" style={{ color: equipeCor }} />
                        Detalhes da Equipe
                    </DialogTitle>
                </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 p-6 max-h-[70vh] overflow-y-auto">
                    {/* Membros e Coordenação */}
                    <Card className="border border-gray-200">
                         <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-gray-700 flex items-center gap-2">
                                <Users className='w-4 h-4 text-blue-600' /> Resumo da Equipe
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="text-2xl font-bold text-gray-800 mb-2">
                                    {equipe?.total_membros || 0} Membros
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-bold text-gray-800">Cor:</p>
                                    <div 
                                    className="w-6 h-6 rounded-full border border-gray-300"
                                    style={{ backgroundColor: equipeCor }}
                                    title={`Cor da equipe: ${equipeCor}`}
                                    ></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-gray-700 flex items-center gap-2">
                                <User className='w-4 h-4 text-blue-600' /> Lista de Membros
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        {isLoading ? (
                            <>
                            <SkeletonLoader />
                            <SkeletonLoader />
                            <SkeletonLoader />
                            </>
                        ) : membros.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Nenhum membro encontrado.</p>
                        ) : (
                            // Lista os membros
                            membros.map((membro) => (
                            <div 
                                key={membro.id} 
                                className={`flex items-center justify-between p-2 rounded-md ${
                                membro.isCoordenador ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                                }`}
                            >
                                <p className="font-medium text-gray-800">{membro.nome}</p>
                                {membro.isCoordenador && (
                                <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                                    <Star className="w-3 h-3" />
                                    Coordenador
                                </div>
                                )}
                            </div>
                            ))
                        )}
                        </CardContent>
                    </Card>

                </div>

                <div className="p-6 pt-0 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InfosEquipeModal;