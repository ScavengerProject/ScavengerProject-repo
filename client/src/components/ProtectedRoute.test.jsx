import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('./ui/toast', () => ({ toast: { error: vi.fn() } }));

import ProtectedRoute from './ProtectedRoute';

// Renderiza a rota protegida dentro de um roteador em memória, com páginas-alvo
// para detectarmos para onde o usuário foi redirecionado.
function renderRota({ usuario, isAuthenticated, requiredRole }) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <ProtectedRoute usuario={usuario} isAuthenticated={isAuthenticated} requiredRole={requiredRole}>
              <div>Conteúdo Protegido</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redireciona para /login quando não autenticado', () => {
    renderRota({ usuario: null, isAuthenticated: false, requiredRole: 'ADMIN' });
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo quando o tipo do usuário é permitido', () => {
    renderRota({ usuario: { tipo: 'ADMIN' }, isAuthenticated: true, requiredRole: 'ADMIN' });
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });

  it('aceita uma lista de papéis em requiredRole', () => {
    renderRota({ usuario: { tipo: 'COORDENADOR' }, isAuthenticated: true, requiredRole: ['ADMIN', 'COORDENADOR'] });
    expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
  });

  it('redireciona para / quando o usuário não tem permissão', () => {
    renderRota({ usuario: { tipo: 'ALUNO' }, isAuthenticated: true, requiredRole: 'ADMIN' });
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });
});
