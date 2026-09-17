import React from 'react';
import { Ban, LogOut, RefreshCw, School, UserX } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscola } from '../hooks/useEscola';
import { Button } from '../components/ui/button';

/**
 * Fim de linha de quem teve o vínculo bloqueado — destino dos codigos
 * `VINCULO_INATIVO` e `VINCULO_BANIDO` (ver services/api.js) e da rota que o
 * App.jsx escolhe quando `acessoBloqueado` é true (nenhuma escola aberta e ao
 * menos uma bloqueada).
 *
 * É uma tela TERMINAL de propósito: ela não dispara nenhuma requisição com
 * escopo. Esse é o ponto do arquivo. Antes, o bloqueio caía no mesmo tratamento
 * de "perdi acesso" e o usuário era mandado para /selecionar-escola, onde a
 * única escola da lista era justamente a bloqueada — o EscolaProvider a
 * selecionava sozinho, /selecionar-gincana levava 403 e a página recarregava
 * de volta para a seleção, em laço. Sem requisição com escopo aqui, não há como
 * voltar a esse ciclo.
 *
 * Os dois estados têm textos diferentes porque significam coisas diferentes:
 * INATIVO é administrativo e reversível ("peça a reativação"), BANIDO é uma
 * decisão disciplinar e definitiva ("procure a coordenação").
 */
const APARENCIA = {
  BANIDO: {
    Icone: Ban,
    corIcone: 'bg-red-100 text-red-700',
    titulo: 'Acesso encerrado',
    verbo: 'foi encerrado',
    detalhe:
      'O encerramento parte de uma decisão da administração da escola e não é '
      + 'desfeito automaticamente. Se você acredita que houve um engano, procure a '
      + 'coordenação da escola.',
  },
  INATIVO: {
    Icone: UserX,
    corIcone: 'bg-gray-200 text-gray-700',
    titulo: 'Acesso desativado',
    verbo: 'está desativado',
    detalhe:
      'A desativação é temporária e pode ser desfeita por um administrador da '
      + 'escola — costuma acontecer com contas fora de uso ou com quem saiu no meio '
      + 'do ano. Peça a reativação à coordenação e verifique novamente.',
  },
};

export default function AcessoBloqueado() {
  const { usuario, logout } = useAuth();
  const {
    escolasBloqueadas,
    escolasDisponiveis,
    loading,
    recarregarEscolas,
    setEscolaAtiva,
  } = useEscola();

  // Basta uma escola bloqueada para explicar a situação. Quem tem mais de uma
  // (só perfis multi-escola) vê a lista inteira logo abaixo.
  const principal = escolasBloqueadas[0] || null;
  const { Icone, corIcone, titulo, verbo, detalhe } =
    APARENCIA[principal?.meu_vinculo_status] || APARENCIA.INATIVO;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <span className={`inline-flex items-center justify-center rounded-full w-16 h-16 mx-auto mb-4 ${corIcone}`}>
            <Icone size={32} />
          </span>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{titulo}</h1>

          <p className="text-sm text-gray-600 mb-1">
            Olá, {usuario?.nome}. Seu acesso{principal?.nome ? (
              <>
                {' '}à escola{' '}
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                  <School size={14} /> {principal.nome}
                </span>
              </>
            ) : ' a esta escola'} {verbo}.
          </p>
          <p className="text-sm text-gray-600 mb-6">{detalhe}</p>

          {escolasBloqueadas.length > 1 && (
            <ul className="text-left text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 space-y-1">
              {escolasBloqueadas.map((escola) => (
                <li key={escola._id} className="flex items-center justify-between gap-2">
                  <span className="wrap-break-word">{escola.nome}</span>
                  <span className="shrink-0 font-semibold">
                    {escola.meu_vinculo_status === 'BANIDO' ? 'Encerrado' : 'Desativado'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Um perfil multi-escola (ADMIN/PROFESSOR) pode ter sido bloqueado em
              uma escola e continuar ativo em outra: nesse caso esta tela é só
              uma passagem, e a saída é entrar na escola que sobrou. */}
          {escolasDisponiveis.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Você continua com acesso {escolasDisponiveis.length === 1 ? 'a esta escola:' : 'a estas escolas:'}
              </p>
              <ul className="space-y-2">
                {escolasDisponiveis.map((escola) => (
                  <li key={escola._id}>
                    <button
                      type="button"
                      onClick={() => setEscolaAtiva(escola._id)}
                      className="w-full text-left border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-2"
                    >
                      <School size={16} className="text-emerald-600 shrink-0" />
                      <span className="wrap-break-word">{escola.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
