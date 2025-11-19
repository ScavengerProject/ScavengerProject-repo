import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, ArrowLeft, BookOpen, Mail, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../components/ui/toast';
import { notificacoesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../components/MainLayout';

export default function Notificacoes() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // 'todas', 'lidas', 'nao-lidas'

  useEffect(() => {
    carregarNotificacoes();
  }, [filtro]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtro === 'lidas') params.lida = true;
      if (filtro === 'nao-lidas') params.lida = false;

      const dados = await notificacoesService.listar(params);
      setNotificacoes(dados || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toast.error(error.message || 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoLida = async (id) => {
    try {
      await notificacoesService.marcarComoLida(id);
      setNotificacoes(notificacoes.map(n => 
        n._id === id ? { ...n, lida: true, lida_em: new Date() } : n
      ));
      toast.success('Notificação marcada como lida');
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error(error.message || 'Erro ao marcar notificação');
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await notificacoesService.marcarTodasComoLidas();
      await carregarNotificacoes();
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error(error.message || 'Erro ao marcar notificações');
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta notificação?')) {
      return;
    }

    try {
      await notificacoesService.deletar(id);
      setNotificacoes(notificacoes.filter(n => n._id !== id));
      toast.success('Notificação excluída');
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      toast.error(error.message || 'Erro ao deletar notificação');
    }
  };

  const formatarData = (data) => {
    if (!data) return '';
    const date = new Date(data);
    const hoje = new Date();
    const diffTime = Math.abs(hoje - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `Há ${diffDays - 1} dias`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'NOVA_PROVA':
        return <BookOpen className="text-blue-600" size={20} />;
      case 'RESULTADO':
        return <CheckCheck className="text-green-600" size={20} />;
      case 'COMUNICADO':
        return <Mail className="text-purple-600" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'NOVA_PROVA':
        return 'Nova Prova';
      case 'RESULTADO':
        return 'Resultado';
      case 'COMUNICADO':
        return 'Comunicado';
      default:
        return tipo;
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Filtros e ações */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtro === 'todas' ? 'default' : 'outline'}
              onClick={() => setFiltro('todas')}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Todas ({notificacoes.length})
            </Button>
            <Button
              variant={filtro === 'nao-lidas' ? 'default' : 'outline'}
              onClick={() => setFiltro('nao-lidas')}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Não lidas ({naoLidas})
            </Button>
            <Button
              variant={filtro === 'lidas' ? 'default' : 'outline'}
              onClick={() => setFiltro('lidas')}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Lidas ({notificacoes.length - naoLidas})
            </Button>
          </div>

          {naoLidas > 0 && (
            <Button
              onClick={handleMarcarTodasComoLidas}
              size="sm"
              className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <CheckCheck size={16} className="shrink-0" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
              <span className="sm:hidden">Marcar todas</span>
            </Button>
          )}
        </div>

        {/* Lista de notificações */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando notificações...</p>
          </div>
        ) : notificacoes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">
                {filtro === 'nao-lidas' 
                  ? 'Você não tem notificações não lidas'
                  : filtro === 'lidas'
                  ? 'Você não tem notificações lidas'
                  : 'Você não tem notificações'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {notificacoes.map((notificacao) => (
              <Card
                key={notificacao._id}
                className={`transition-all ${
                  !notificacao.lida
                    ? 'bg-blue-50 border-blue-200 shadow-md'
                    : 'bg-white border-gray-200'
                }`}
              >
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 flex-1 w-full overflow-hidden">
                      <div className="mt-0.5 shrink-0">
                        {getTipoIcon(notificacao.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className={`font-semibold text-sm sm:text-base md:text-lg break-words ${
                            !notificacao.lida ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notificacao.titulo}
                          </h3>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded shrink-0">
                            {getTipoLabel(notificacao.tipo)}
                          </span>
                          {!notificacao.lida && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded shrink-0">
                              Nova
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 mb-3 break-words">{notificacao.mensagem}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar size={14} className="shrink-0" />
                            <span>{formatarData(notificacao.criado_em)}</span>
                          </div>
                          {notificacao.email_enviado && (
                            <div className="flex items-center gap-1 text-green-600 shrink-0">
                              <Mail size={14} className="shrink-0" />
                              <span className="hidden sm:inline">Email enviado</span>
                              <span className="sm:hidden">Email</span>
                            </div>
                          )}
                          {notificacao.prova_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/provas`)}
                              className="text-xs"
                            >
                              Ver prova
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      {!notificacao.lida && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarcarComoLida(notificacao._id)}
                          className="flex items-center gap-1 text-xs flex-1 sm:flex-initial"
                        >
                          <Check size={14} className="shrink-0" />
                          <span className="hidden sm:inline">Marcar como lida</span>
                          <span className="sm:hidden">Lida</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletar(notificacao._id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs"
                      >
                        <Trash2 size={14} className="shrink-0" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

