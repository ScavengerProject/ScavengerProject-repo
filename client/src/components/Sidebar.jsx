import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, Users, UserCheck, Handshake, MessageSquare, 
  History, Gavel, AlertCircle, User,
  ChevronRight, Menu, X, ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';

export default function Sidebar({ usuario, isOpen, onToggle, isMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = usuario?.tipo === 'ADMIN';
  const isCoordenador = usuario?.tipo === 'COORDENADOR';
  
  // Estado para controlar seções expansíveis
  const [expandedSections, setExpandedSections] = useState({
    emprestimosAdmin: true,
    minhaEquipe: true,
    emprestimosCoord: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuItems = [
    {
      id: 'dashboard',
      icon: BookOpen,
      title: 'Central de Informações',
      description: 'Painel principal',
      path: '/',
      color: 'blue',
      show: true
    },
    {
      id: 'inscricao',
      icon: UserCheck,
      title: 'Inscrição em Equipe',
      description: 'Escolha sua equipe',
      path: '/inscricao-equipes',
      color: 'indigo',
      show: usuario?.tipo === 'ALUNO'
    },
    // {
    //   id: 'migracao',
    //   icon: Users,
    //   title: 'Migrar de Equipe',
    //   description: 'Solicitar mudança',
    //   path: '/migracoes/solicitar',
    //   color: 'amber',
    //   show: ['ALUNO', 'PROFESSOR', 'PAI/MÃE'].includes(usuario?.tipo)
    // },
    {
      id: 'gerenciar-provas',
      icon: BookOpen,
      title: 'Gerenciar Provas',
      description: 'Criar e editar provas',
      path: '/admin/provas',
      color: 'blue',
      show: isAdmin
    },
    {
      id: 'gerenciar-equipes',
      icon: Users,
      title: 'Gerenciar Equipes',
      description: 'Administrar equipes',
      path: '/admin/equipes',
      color: 'purple',
      show: isAdmin
    },
    {
      id: 'gerenciar-usuarios',
      icon: User,
      title: 'Gerenciar Usuários',
      description: 'Configurar usuários',
      path: '/admin/usuarios',
      color: 'teal',
      show: isAdmin
    },
    // Seção expansível para Empréstimos (Admin)
    {
      id: 'emprestimos-admin-section',
      icon: Handshake,
      title: 'Gerenciar Empréstimos',
      description: 'Solicitações e empréstimos',
      color: 'indigo',
      show: isAdmin,
      isSection: true,
      sectionKey: 'emprestimosAdmin',
      subItems: [
        {
          id: 'aprovar-solicitacoes',
          title: 'Aprovar Solicitações',
          path: '/admin/aprovar-solicitacoes',
        },
        {
          id: 'emprestimos-admin',
          title: 'Ver Empréstimos Ativos',
          path: '/admin/emprestimos',
        }
      ]
    },
    // Seção expansível para Minha Equipe (Coordenador)
    {
      id: 'minha-equipe-section',
      icon: UserCheck,
      title: 'Minha Equipe',
      description: 'Gerenciar time',
      color: 'green',
      show: isCoordenador,
      isSection: true,
      sectionKey: 'minhaEquipe',
      subItems: [
        {
          id: 'acessar-equipe',
          title: 'Acessar Equipe',
          path: '/minha-equipe',
        },
        // {
        //   id: 'migracoes-pendentes',
        //   title: 'Solicitações de migração',
        //   path: '/migracoes/pendentes',
        // }
      ]
    },
    // Seção expansível para Empréstimos (Coordenador)
    {
      id: 'emprestimos-coord-section',
      icon: Handshake,
      title: 'Gerenciar Empréstimos',
      description: 'Solicitar, ofertar e gerenciar',
      color: 'blue',
      show: isCoordenador,
      isSection: true,
      sectionKey: 'emprestimosCoord',
      subItems: [
        {
          id: 'solicitar-emprestimo',
          title: 'Solicitar Membros',
          path: '/coord/solicitar-emprestimo',
        },
        {
          id: 'ofertar-membros',
          title: 'Ofertar Membros',
          path: '/coord/ofertar-membros',
        },
        {
          id: 'emprestimos-coord',
          title: 'Ver Empréstimos Ativos',
          path: '/coord/gerenciar-emprestimos',
        }
      ]
    },
    {
      id: 'penalidades-admin',
      icon: Gavel,
      title: 'Gerenciar Penalidades',
      description: 'Aplicar penalidades',
      path: '/admin/penalidades',
      color: 'red',
      show: isAdmin
    },
    {
      id: 'penalidades-equipe',
      icon: AlertCircle,
      title: 'Penalidades da Equipe',
      description: 'Ver penalidades',
      path: '/equipes/penalidades',
      color: 'red',
      show: ['COORDENADOR', 'ALUNO', 'PROFESSOR'].includes(usuario?.tipo)
    },
    {
      id: 'feedbacks-admin',
      icon: MessageSquare,
      title: 'Gerenciar Feedbacks',
      description: 'Analisar feedbacks',
      path: '/admin/feedbacks',
      color: 'pink',
      show: isAdmin
    },
    {
      id: 'meus-feedbacks',
      icon: History,
      title: 'Meus Feedbacks',
      description: 'Ver histórico',
      path: '/meus-feedbacks',
      color: 'indigo',
      show: true
    }
  ];

  const visibleItems = menuItems.filter(item => item.show);

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200',
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200',
    teal: 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
    pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200'
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onToggle(); // Fechar sidebar automaticamente no mobile após navegação
    }
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed' : 'sticky'} top-0 h-screen bg-white border-r border-gray-200 
          transition-all duration-300 ease-in-out z-40 shrink-0
          ${isOpen ? (isMobile ? 'w-80' : 'w-72') : 'w-0'}
          ${isOpen ? 'overflow-y-auto' : 'overflow-hidden'}
        `}
      >
        <div className={`p-4 sm:p-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
          {/* Header com Logo e Botão Fechar */}
          {isOpen && (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">Arena</h1>
                <p className="text-xs sm:text-sm text-gray-600">Gerenciador de Gincanas</p>
              </div>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Ocultar menu"
              >
                <X size={isMobile ? 24 : 18} className="text-gray-600" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              
              // Se for uma seção expansível
              if (item.isSection) {
                const isExpanded = expandedSections[item.sectionKey];
                const hasActiveSubItem = item.subItems?.some(sub => location.pathname === sub.path);
                
                return (
                  <div key={item.id} className="space-y-1">
                    {/* Botão principal da seção */}
                    <button
                      onClick={() => toggleSection(item.sectionKey)}
                      className={`
                        w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all
                        ${hasActiveSubItem 
                          ? `${colorClasses[item.color]} shadow-md` 
                          : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                        }
                      `}
                    >
                      <Icon size={isMobile ? 24 : 20} className="shrink-0" />
                      <div className="flex-1 text-left overflow-hidden">
                        <p className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold break-words`}>{item.title}</p>
                        <p className={`${isMobile ? 'text-sm' : 'text-xs'} opacity-75 break-words`}>{item.description}</p>
                      </div>
                      <ChevronDown 
                        size={isMobile ? 20 : 16} 
                        className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {/* Sub-itens */}
                    {isExpanded && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                        {item.subItems?.map((subItem) => {
                          const isActive = location.pathname === subItem.path;
                          
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => handleNavigation(subItem.path)}
                              className={`
                                w-full flex items-center gap-2 p-3 sm:p-2.5 px-3 rounded-lg transition-all text-left
                                ${isActive 
                                  ? 'bg-gray-200 text-gray-900 font-semibold' 
                                  : 'hover:bg-gray-100 text-gray-600'
                                }
                              `}
                            >
                              <span className={`${isMobile ? 'text-base' : 'text-sm'} break-words flex-1`}>{subItem.title}</span>
                              {isActive && <ChevronRight size={isMobile ? 18 : 14} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Item normal (não é seção)
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all
                    ${isActive 
                      ? `${colorClasses[item.color]} shadow-md` 
                      : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                    }
                  `}
                >
                  <Icon size={isMobile ? 24 : 20} className="shrink-0" />
                  <div className="flex-1 text-left overflow-hidden">
                    <p className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold break-words`}>{item.title}</p>
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} opacity-75 break-words`}>{item.description}</p>
                  </div>
                  {isActive && <ChevronRight size={isMobile ? 20 : 16} className="shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

