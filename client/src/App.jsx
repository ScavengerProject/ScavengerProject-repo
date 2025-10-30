import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminProvas from './pages/AdminProvas';
import AdminEquipes from './pages/AdminEquipes.jsx';
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
        {/* Login: se autenticado, manda para home */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Home protegida */}
        <Route
          path="/"
          element={isAuthenticated ? (
            <Home usuario={usuario} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )}
        />

        {/* Dashboard protegida */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        {/* Rota para o Gerenciamento de Equipes (Admin) */}
        <Route
          path="/admin/equipes"
          element={isAuthenticated ? <AdminEquipes /> : <Navigate to="/login" replace />}
        />

        {/* Admin Provas protegida */}
        <Route
          path="/admin/provas"
          element={isAuthenticated ? <AdminProvas /> : <Navigate to="/login" replace />}
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;