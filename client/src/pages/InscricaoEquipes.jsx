import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowLeft, Users, LogIn, Zap, CheckCircle2, Ban } from 'lucide-react';
import { toast } from '../components/ui/toast';
import { equipesService } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';
import MainLayout from '../components/MainLayout';

/**
 * Calcula uma cor de texto (preto/branco) com bom contraste para um fundo hexadecimal.
 * Usado para que a label da "Minha equipe" fique legível sobre a cor da equipe.
 */
const getContrastColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  if (c.length !== 6) return '#ffffff';
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Luminância relativa (sRGB)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#1f2937' : '#ffffff';
};

const InscricaoEquipes = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const [equipes, setEquipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inscrievendo, setInscrievendo] = useState(null);
  const [minhaEquipe, setMinhaEquipe] = useState(null);

  useEffect(() => {
    const fetchEquipes = async () => {
      try {
        setIsLoading(true);
        const data = await equipesService.listarEquipesParaInscricao();
        setEquipes(data);

        // 1) Tenta usar o marcador enviado pelo backend.
        let minhaEquipeId = null;
        const marcada = data.find((eq) => eq.isMinhaEquipe);
        if (marcada) {
          minhaEquipeId = String(marcada.id || marcada._id);
        } else {
          // 2) Fallback robusto no client: consulta o ID da equipe do usuário.
          //    (404 = usuário não pertence a nenhuma equipe.)
          try {
            const res = await equipesService.buscarMinhaEquipeId();
            if (res?.equipe_id) minhaEquipeId = String(res.equipe_id);
          } catch (_) {
            // Sem equipe: segue o fluxo normal de inscrição.
          }
        }

        const minha =
          data.find((eq) => String(eq.id || eq._id) === minhaEquipeId) ||
          marcada ||
          null;
        setMinhaEquipe(minha);
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

  // Verifica se a equipe recebida é a equipe atual do usuário.
  const ehMinhaEquipe = (equipe) => {
    if (!minhaEquipe) return false;
    return (
      String(equipe.id || equipe._id) ===
      String(minhaEquipe.id || minhaEquipe._id)
    );
  };

  if (isLoading) {
    return (
      <MainLayout usuario={usuario} onLogout={logout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg font-semibold">Carregando equipes...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Informações da página */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {minhaEquipe ? 'Sua Equipe' : 'Escolha sua Equipe'}
          </h2>
          <p className="text-gray-600">
            {minhaEquipe
              ? 'Você já faz parte de uma equipe. Para trocar de equipe, solicite uma migração.'
              : 'Selecione uma das equipes disponíveis para participar ativamente das provas da gincana.'
            }
          </p>
        </div>

        {/* Grid de Equipes */}
        {equipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipes.map((equipe) => {
              const minha = ehMinhaEquipe(equipe);
              const corEquipe = equipe.cor || '#16a34a';

              return (
                <Card
                  key={equipe.id || equipe._id}
                  className={`shadow-md border-2 transition-all ${
                    minha ? 'shadow-lg' : 'border-gray-200 hover:shadow-lg'
                  }`}
                  style={minha ? { borderColor: corEquipe } : undefined}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-8 w-8 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: equipe.cor || '#ccc' }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg text-gray-900">{equipe.nome}</CardTitle>
                          {minha && (
                            <CheckCircle2 className="h-5 w-5" style={{ color: corEquipe }} />
                          )}
                        </div>
                        {minha && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                            style={{
                              backgroundColor: corEquipe,
                              color: getContrastColor(corEquipe),
                            }}
                          >
                            Sua equipe atual
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Informações da Equipe */}
                    <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
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

                    {/* Botão de Inscrição ou Estado da Equipe */}
                    {minha ? (
                      // Equipe atual do usuário: botão com a cor da própria equipe.
                      <Button
                        disabled
                        className="w-full font-semibold py-2 rounded-lg cursor-default disabled:opacity-100"
                        style={{
                          backgroundColor: corEquipe,
                          color: getContrastColor(corEquipe),
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 inline" />
                        Minha equipe
                      </Button>
                    ) : minhaEquipe ? (
                      // Usuário já está em OUTRA equipe: inscrição bloqueada.
                      <Button
                        disabled
                        className="w-full bg-gray-200 text-gray-500 font-semibold py-2 rounded-lg cursor-not-allowed disabled:opacity-100"
                      >
                        <Ban className="h-4 w-4 mr-2 inline" />
                        Já inscrito em outra equipe
                      </Button>
                    ) : (
                      // Usuário sem equipe: pode se inscrever.
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
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
      </div>
    </MainLayout>
  );
};

export default InscricaoEquipes;
