import React from 'react';
import { Clock, LogOut, RefreshCw, School } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import { Button } from '../components/ui/button';

/**
 * Tela de espera do vínculo PENDENTE — destino do `codigo: 'VINCULO_PENDENTE'`
 * (ver services/api.js). Cobre dois casos: cadastro pelo código público da
 * escola (sem turma) e uma transferência de escola aguardando o ADMIN de
 * destino decidir (ver conviteController.decidirPendencia).
 *
 * Diferente de "sem vínculo nenhum" (SEM_VINCULO_ESCOLA), aqui a escola ativa
 * continua salva de propósito — é ela que está em análise — por isso não há
 * botão de "escolher outra escola" nesta tela além de sair da conta.
 */
export default function AguardandoAprovacao() {
  const { usuario, logout } = useAuth();
  const { escolaAtiva, loading, recarregarEscolas } = useEscola();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 rounded-full w-16 h-16 mx-auto mb-4">
            <Clock size={32} />
          </span>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Aguardando aprovação</h1>
          <p className="text-sm text-gray-600 mb-1">
            Olá, {usuario?.nome}. Seu vínculo{escolaAtiva?.nome ? (
              <>
                {' '}com a escola{' '}
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                  <School size={14} /> {escolaAtiva.nome}
                </span>
              </>
            ) : ' com esta escola'} ainda está aguardando a decisão de um administrador.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Isso acontece quando o cadastro foi feito pelo código público da escola (sem turma),
            ou quando você solicitou uma transferência de escola. Volte mais tarde ou entre em
            contato com a coordenação.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={recarregarEscolas}
              disabled={loading}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Verificando...' : 'Verificar novamente'}
            </Button>
            <Button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
