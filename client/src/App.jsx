import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminProvas from './pages/AdminProvas';
import { useToast } from './components/ui/toast';
import { ToastContainer } from './components/ui/ToastContainer';

function App() {
  const { usuario, isAuthenticated, loading, logout } = useAuth();
  const { toasts } = useToast();

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Rota de Login */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        
        {/* Rotas Protegidas */}
        {isAuthenticated ? (
          <>
            <Route path="/" element={<Home usuario={usuario} onLogout={handleLogout} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/provas" element={<AdminProvas />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;