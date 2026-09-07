import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/ui/toast';
import { AuthProvider } from './hooks/useAuth.jsx';
import { EscolaProvider } from './hooks/useEscola.jsx';
import { GincanaProvider } from './hooks/useGincana.jsx';
import App from './App.jsx';
import './index.css';

const rootElement = document.getElementById('root');

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        {/* Escola (tenant) envolve Gincana: a edição ativa só faz sentido
            dentro de uma escola, e trocar de escola reseta a gincana. */}
        <EscolaProvider>
          <GincanaProvider>
            <App />
          </GincanaProvider>
        </EscolaProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);