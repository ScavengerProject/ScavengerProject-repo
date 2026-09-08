import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/ui/toast';
import { AuthProvider } from './hooks/useAuth.jsx';
import { EscolaProvider } from './hooks/useEscola.jsx';
import { GincanaProvider } from './hooks/useGincana.jsx';
import { EquipeProvider } from './hooks/useEquipe.jsx';
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
            {/* Equipe envolve o App e depende da gincana ativa: é a última
                etapa do escopo de entrada (escola -> gincana -> equipe). */}
            <EquipeProvider>
              <App />
            </EquipeProvider>
          </GincanaProvider>
        </EscolaProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);