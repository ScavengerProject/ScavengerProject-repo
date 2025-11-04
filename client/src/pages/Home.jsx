import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, BookOpen, BarChart3, Settings, Users, UserCheck, Handshake } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Home({ usuario, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Agora inclui coordenador
  const isAdmin = usuario?.tipo === 'ADMIN';
  const isAdminOrCoordenador = isAdmin || usuario?.tipo === 'COORDENADOR';

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">RPVI</h1>
            <p className="text-xs text-gray-600">Sistema de Provas</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Informações do usuário */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <div className="bg-linear-to-br from-blue-600 to-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{usuario?.nome}</p>
                <p className="text-xs text-gray-600">{usuario?.email}</p>
              </div>
            </div>

            {/* Botão Logout */}
            <Button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Bem-vindo */}
          <div className="md:col-span-3 bg-white rounded-xl shadow-lg p-8 border border-gray-200 bg-linear-to-r from-blue-50 to-gray-50">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Olá, {usuario?.nome}! 👋
            </h2>
            <p className="text-gray-700 text-lg">
              Bem-vindo ao Sistema de Provas RPVI. Aqui você pode gerenciar suas provas e avaliar seus conhecimentos.
            </p>
          </div>

          {/* Card Provas */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-blue-300">
            <div className="bg-linear-to-br from-blue-100 to-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <BookOpen className="text-blue-700" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Minhas Provas</h3>
            <p className="text-gray-600 mb-4">Acesse todas as suas provas e acompanhe seu progresso.</p>
            <Button
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
            >
              Ver Provas
            </Button>
          </div>

          {/* Card de Inscrição em Equipe (para Alunos) */}
          {usuario?.tipo === 'ALUNO' && (
            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-indigo-300"
            >
              <div className="bg-linear-to-br from-indigo-100 to-indigo-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <UserCheck className="text-indigo-700" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inscrição em Equipe</h3>
              <p className="text-gray-600 mb-4">Escolha uma equipe para participar ativamente das provas da gincana.</p>
              <Button
                variant="outline" 
                onClick={() => navigate('/inscricao-equipes')}
                className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
              >
                Inscrever-se em Equipe
              </Button>
            </div>
          )}

          {/* Novo card: Gerenciar Equipes */}
          {isAdminOrCoordenador && (
            <div 
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-purple-300"
            >
                <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <Users className="text-purple-700" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gerenciar Equipes</h3>
                <p className="text-gray-600 mb-4">Crie equipes, defina coordenadores e adicione participantes.</p>
                <Button
                    variant="outline" 
                    onClick={() => navigate('/admin/equipes')}
                    className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
                >
                    Acessar Gerenciamento
                </Button>
              </div>
          )}
          {/* Card: Solicitar Migração (Aluno/Professor/Pai-Mãe) */}
          {['ALUNO','PROFESSOR','PAI/MÃE'].includes(usuario?.tipo) && (
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-amber-300">
              <div className="bg-linear-to-br from-amber-100 to-amber-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Users className="text-amber-700" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Migrar de Equipe</h3>
              <p className="text-gray-600 mb-4">Peça para entrar em outra equipe e acompanhe o status.</p>
              <Button
                variant="outline"
                onClick={() => navigate('/migracoes/solicitar')}
                className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
              >
                Solicitar migração
              </Button>
            </div>
          )}

          {/* Card: Gerenciar Equipes (Admin ou Coordenador) */}
          {isAdmin && (
            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-purple-300"
            >
              <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Users className="text-purple-700" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gerenciar Equipes</h3>
              <p className="text-gray-600 mb-4">Crie equipes, defina coordenadores e adicione participantes.</p>
              <Button
                variant="outline" 
                onClick={() => navigate('/admin/equipes')}
                className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
              >
                Acessar Gerenciamento
              </Button>
            </div>
          )}

          {/* Card: Gerenciar Empréstimos (Admin) */}
          {isAdmin && (
            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-indigo-300"
            >
              <div className="bg-linear-to-br from-indigo-100 to-indigo-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Handshake className="text-indigo-700" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Empréstimos de Alunos</h3>
              <p className="text-gray-600 mb-4">Autorize empréstimos temporários entre equipes em provas específicas.</p>
              <Button
                variant="outline" 
                onClick={() => navigate('/admin/emprestimos')}
                className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
              >
                Gerenciar Empréstimos
              </Button>
            </div>
          )}

          {/* Card para o Coordenador gerenciar sua própria equipe + aprovar migrações */}
          {usuario?.tipo === 'COORDENADOR' && (
            <div 
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-green-300"
            >
              <div className="bg-linear-to-br from-green-100 to-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <UserCheck className="text-green-700" size={24} /> 
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Minha Equipe</h3>
              <p className="text-gray-600 mb-4">Visualize e gerencie os integrantes do seu time.</p>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline" 
                  onClick={() => navigate('/minha-equipe')}
                  className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
                >
                  Acessar Equipe
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/migracoes/pendentes')}
                  className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
                >
                  Solicitações de migração
                </Button>
              </div>
            </div>
          )}

          {/* Card Resultados */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-green-300">
            <div className="bg-linear-to-br from-green-100 to-green-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <BarChart3 className="text-green-700" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Resultados</h3>
            <p className="text-gray-600 mb-4">Confira seus resultados e desempenho nas provas.</p>
            <Button 
              variant="outline"
              className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md"
            >
              Ver Resultados
            </Button>
          </div>

          {/* Card Configurações */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-gray-200 hover:border-blue-300">
            <div className="bg-linear-to-br from-blue-100 to-blue-50 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Settings className="text-blue-700" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Configurações</h3>
            <p className="text-gray-600 mb-4">Ajuste suas preferências e dados de perfil.</p>
            <Button 
              variant="outline"
              className="w-full border-gray-300 hover:bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg transition shadow-md mt-6"
            >
              Configurar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
