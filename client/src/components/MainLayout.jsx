import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Menu, X, User } from 'lucide-react';
import { Button } from './ui/button';
import Sidebar from './Sidebar';
import NotificacoesDropdown from './NotificacoesDropdown';
import FeedbackFAB from './EnviarFeedbackModal';

export default function MainLayout({ usuario, onLogout, children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Fechar sidebar automaticamente no mobile
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay para mobile quando sidebar está aberto */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        usuario={usuario} 
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>
        {/* Top Navbar */}
        <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-20">
          <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Botão Toggle Sidebar - sempre visível no mobile */}
              {(isMobile || !sidebarOpen) && (
                <>
                  <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="sm"
                    className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-lg shrink-0"
                    title="Mostrar menu"
                  >
                    <Menu size={isMobile ? 24 : 20} />
                  </Button>
                  {!isMobile && (
                    <div className="overflow-hidden">
                      <h1 className="text-lg sm:text-xl font-bold text-blue-700">Arena</h1>
                      <p className="text-xs text-gray-600 hidden sm:block">Gerenciador de Gincanas</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
              {/* Dropdown de Notificações */}
              <NotificacoesDropdown />

              {/* User Info - oculto no mobile */}
              <div className="hidden lg:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 max-w-xs">
                <div className="bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-900 wrap-break-word">{usuario?.nome}</p>
                  <p className="text-xs text-gray-600 wrap-break-word">{usuario?.email}</p>
                </div>
              </div>

              {/* Botão Logout - maior no mobile */}
              <Button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition font-semibold shadow-md hover:shadow-lg text-sm sm:text-base shrink-0"
              >
                <LogOut size={isMobile ? 20 : 18} />
                <span className="hidden sm:inline whitespace-nowrap">Sair</span>
              </Button>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Feedback FAB */}
      <FeedbackFAB />
    </div>
  );
}

