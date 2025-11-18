import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Menu, X, User } from 'lucide-react';
import { Button } from './ui/button';
import Sidebar from './Sidebar';
import NotificacoesDropdown from './NotificacoesDropdown';
import FeedbackFAB from './EnviarFeedbackModal';

export default function MainLayout({ usuario, onLogout, children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        usuario={usuario} 
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>
        {/* Top Navbar */}
        <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-20">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Botão Toggle Sidebar - só aparece quando fechado */}
              {!sidebarOpen && (
                <>
                  <Button
                    onClick={toggleSidebar}
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Mostrar menu"
                  >
                    <Menu size={20} />
                  </Button>
                  <div>
                    <h1 className="text-xl font-bold text-blue-700">Arena</h1>
                    <p className="text-xs text-gray-600">Gerenciador de Gincanas</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Dropdown de Notificações */}
              <NotificacoesDropdown />

              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{usuario?.nome}</p>
                  <p className="text-xs text-gray-600 truncate">{usuario?.email}</p>
                </div>
              </div>

              {/* Botão Logout */}
              <Button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Sair</span>
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

