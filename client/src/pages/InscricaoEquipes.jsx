import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowLeft, Users, LogIn, Zap } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { equipesService } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';

const InscricaoEquipes = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [equipes, setEquipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inscrievendo, setInscrievendo] = useState(null); // Para controlar qual equipe está sendo processada

  useEffect(() => {
    const fetchEquipes = async () => {
      try {
        setIsLoading(true);
        const data = await equipesService.listarEquipes();
        setEquipes(data);
      } catch (error) {
        toast.error('Erro ao carregar equipes disponíveis.');
        console.error('Erro na listagem de equipes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipes();
  }, []);

  const handleInscrever = async (equipeid) => {
    try {
      setInscrievendo(equipeid);
      
      const response = await equipesService.inscreverEmEquipe(equipeid);
      
      toast.success(`Parabéns! Você se inscreveu com sucesso!`);
      
      // Redirecionar para a página inicial após 1.5 segundos
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      const mensagemErro = error.message || 'Erro ao se inscrever na equipe.';
      toast.error(mensagemErro);
      console.error('Erro ao se inscrever:', error);
    } finally {
      setInscrievendo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-semibold">Carregando equipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")} 
            className="text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Inscrição em Equipes</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Informações da página */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Escolha sua Equipe</h2>
          <p className="text-gray-600">
            Selecione uma das equipes disponíveis para participar ativamente das provas da gincana.
          </p>
        </div>

        {/* Grid de Equipes */}
        {equipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipes.map((equipe) => (
              <Card 
                key={equipe.id || equipe._id} 
                className="shadow-md border-gray-200 hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="h-8 w-8 rounded-full border-2 border-gray-300" 
                      style={{ backgroundColor: equipe.cor || '#ccc' }}
                    ></div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">{equipe.nome}</CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Informações da Equipe */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span><strong>Membros:</strong> {equipe.total_membros || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span><strong>Pontos:</strong> {equipe.pontos_acumulados || 0}</span>
                    </div>
                    {equipe.coordenador && (
                      <div className="text-sm text-gray-600 border-t border-gray-200 pt-2">
                        <p><strong>Coordenador:</strong> {equipe.coordenador.nome}</p>
                      </div>
                    )}
                  </div>

                  {/* Botão de Inscrição */}
                  <Button
                    onClick={() => handleInscrever(equipe.id || equipe._id)}
                    disabled={inscrievendo === (equipe.id || equipe._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    {inscrievendo === (equipe.id || equipe._id) ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Inscrevendo...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2 inline" />
                        Inscrever-se
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-10 mt-10 border-gray-200">
            <CardTitle className="text-gray-600 mb-2">Nenhuma equipe disponível</CardTitle>
            <CardDescription>
              No momento, não há equipes disponíveis para inscrição. Tente novamente mais tarde.
            </CardDescription>
            <Button
              onClick={() => navigate("/")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Voltar para Home
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default InscricaoEquipes;


