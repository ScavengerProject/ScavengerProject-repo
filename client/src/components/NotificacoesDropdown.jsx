import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Mail, CheckCheck, Calendar, X } from 'lucide-react';
import { Button } from './ui/button';
import { notificacoesService } from '../services/api';
import { toast } from './ui/toast';

export default function NotificacoesDropdown() {
  const navigate = useNavigate();
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificacoesRecentes, setNotificacoesRecentes] = useState([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    carregarContagemNotificacoes();
    // Atualizar a contagem a cada 30 segundos
    const interval = setInterval(carregarContagemNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Carregar notificações quando o dropdown abrir
  useEffect(() => {
    if (isDropdownOpen) {
      carregarNotificacoesRecentes();
    }
  }, [isDropdownOpen]);

  const carregarContagemNotificacoes = async () => {
    try {
      const resultado = await notificacoesService.contarNaoLidas();
      setNotificacoesNaoLidas(resultado.contagem || 0);
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  };

  const carregarNotificacoesRecentes = async () => {
    try {
      setLoadingNotificacoes(true);
      const notificacoes = await notificacoesService.listar({});
      // Pegar as 5 mais recentes
      const recentes = (notificacoes || []).slice(0, 5);
      setNotificacoesRecentes(recentes);
    } catch (error) {
      console.error('Erro ao carregar notificações recentes:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoadingNotificacoes(false);
    }
  };

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMarcarComoLida = async (id, e) => {
    e.stopPropagation();
    try {
      await notificacoesService.marcarComoLida(id);
      setNotificacoesRecentes(notificacoesRecentes.map(n => 
        n._id === id ? { ...n, lida: true } : n
      ));
      setNotificacoesNaoLidas(Math.max(0, notificacoesNaoLidas - 1));
      toast.success('Notificação marcada como lida');
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar notificação');
    }
  };

  const formatarData = (data) => {
    if (!data) return '';
    const date = new Date(data);
    const agora = new Date();
    const diffMs = agora - date;
    const diffMinutos = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `Há ${diffMinutos} min`;
    if (diffHoras < 24) return `Há ${diffHoras}h`;
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `Há ${diffDias} dias`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'NOVA_PROVA':
        return <BookOpen className="text-blue-600" size={16} />;
      case 'RESULTADO':
        return <CheckCheck className="text-green-600" size={16} />;
      case 'COMUNICADO':
        return <Mail className="text-purple-600" size={16} />;
      default:
        return <Bell className="text-gray-600" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={handleToggleDropdown}
        className="relative flex items-center gap-1 sm:gap-2 bg-white hover:bg-gray-50 text-gray-700 px-2 sm:px-3 md:px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg border border-gray-200"
      >
        <Bell size={18} className="sm:w-5 sm:h-5" />
        {notificacoesNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
            {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
          </span>
        )}
      </Button>

      {/* Dropdown de Notificações */}
      {isDropdownOpen && (
        <div className="fixed sm:absolute right-0 left-0 sm:left-auto top-[60px] sm:top-auto sm:right-0 sm:mt-2 w-full sm:w-96 max-w-full sm:max-w-[384px] bg-white rounded-none sm:rounded-lg shadow-xl border-t sm:border border-gray-200 z-50 max-h-[calc(100vh-60px)] sm:max-h-[600px] flex flex-col">
          {/* Header do Dropdown */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notificações</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDropdownOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Lista de Notificações */}
          <div className="overflow-y-auto flex-1">
            {loadingNotificacoes ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs sm:text-sm text-gray-600">Carregando...</p>
              </div>
            ) : notificacoesRecentes.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Bell className="mx-auto text-gray-400 mb-2" size={28} />
                <p className="text-xs sm:text-sm text-gray-600">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificacoesRecentes.map((notificacao) => (
                  <div
                    key={notificacao._id}
                    className={`p-3 sm:p-4 hover:bg-gray-50 transition cursor-pointer ${
                      !notificacao.lida ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      navigate('/notificacoes');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getTipoIcon(notificacao.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm font-semibold break-words ${
                              !notificacao.lida ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {notificacao.titulo}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">
                              {notificacao.mensagem}
                            </p>
                            <div className="flex items-center gap-1 sm:gap-2 mt-2">
                              <Calendar className="text-gray-400 shrink-0" size={12} />
                              <span className="text-xs text-gray-500">
                                {formatarData(notificacao.criado_em)}
                              </span>
                            </div>
                          </div>
                          {!notificacao.lida && (
                            <button
                              onClick={(e) => handleMarcarComoLida(notificacao._id, e)}
                              className="shrink-0 p-1 hover:bg-blue-100 rounded transition"
                              title="Marcar como lida"
                            >
                              <X size={14} className="text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer do Dropdown */}
          <div className="p-2 sm:p-3 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                navigate('/notificacoes');
                setIsDropdownOpen(false);
              }}
              className="w-full text-xs sm:text-sm"
            >
              Ver todas as notificações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

