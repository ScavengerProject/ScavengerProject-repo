import React from 'react';
import { School, MapPin, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import { Button } from '../components/ui/button';

const rotuloPerfil = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  COORDENADOR: 'Coordenador',
  ALUNO: 'Aluno',
  'PAI/MÃE': 'Responsável',
};

const corPerfil = (tipo) => {
  switch (tipo) {
    case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800';
    case 'ADMIN': return 'bg-blue-100 text-blue-800';
    case 'PROFESSOR': return 'bg-teal-100 text-teal-800';
    case 'COORDENADOR': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Primeira tela depois do login: em qual escola o usuário quer entrar.
 *
 * O papel é por escola, então esta escolha define com que perfil ele vai
 * navegar — o crachá em cada card mostra isso antes de entrar. Quem tem uma
 * escola só nunca vê esta tela (o EscolaProvider entra direto).
 */
export default function SelecionarEscola() {
  const { usuario, logout } = useAuth();
  const { minhasEscolas, loading, setEscolaAtiva } = useEscola();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6 text-white">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Olá, {usuario?.nome}</h1>
            <p className="text-white/80 text-sm sm:text-base">Escolha a escola que deseja acessar.</p>
          </div>
          <Button
            onClick={logout}
            className="bg-white/15 hover:bg-white/25 text-white flex items-center gap-2 shrink-0"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {loading && (
            <p className="text-center text-gray-600 py-10">Carregando escolas...</p>
          )}

          {!loading && minhasEscolas.length === 0 && (
            <div className="text-center py-10">
              <School size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="font-semibold text-gray-800">Nenhuma escola disponível</p>
              <p className="text-sm text-gray-600 mt-1">
                Você ainda não está vinculado a nenhuma escola ativa. Peça ao administrador
                do sistema para criar o seu vínculo.
              </p>
            </div>
          )}

          {!loading && minhasEscolas.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {minhasEscolas.map((escola) => (
                <li key={escola._id}>
                  <button
                    type="button"
                    onClick={() => setEscolaAtiva(escola._id)}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition flex items-start gap-3 group"
                  >
                    <span className="bg-emerald-100 text-emerald-700 rounded-lg p-2 shrink-0">
                      <School size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900 wrap-break-word">
                        {escola.nome}
                      </span>
                      {(escola.cidade || escola.uf) && (
                        <span className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                          <MapPin size={12} />
                          {[escola.cidade, escola.uf].filter(Boolean).join(' - ')}
                        </span>
                      )}
                      {escola.meu_tipo && (
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${corPerfil(escola.meu_tipo)}`}>
                          {rotuloPerfil[escola.meu_tipo] || escola.meu_tipo}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      size={20}
                      className="text-gray-400 group-hover:text-blue-600 shrink-0 mt-1"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
