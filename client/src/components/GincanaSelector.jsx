import React from 'react';
import { Trophy } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useGincana } from '../hooks/useGincana';

/**
 * Seletor da gincana ativa ("workspace") exibido na navbar.
 * Troca o escopo de todas as requisições (via header X-Gincana-Id).
 *
 * Edições encerradas aparecem na lista, desabilitadas: elas existem como
 * histórico, mas não podem virar o escopo ativo (a API recusa).
 */
export default function GincanaSelector() {
  const {
    gincanasAcessiveis,
    gincanasEncerradas,
    gincanaAtivaId,
    setGincanaAtiva,
    loading,
  } = useGincana();

  // Sem gincanas disponíveis: nada a exibir.
  if (!loading && gincanasAcessiveis.length === 0 && gincanasEncerradas.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Trophy size={18} className="text-blue-700 shrink-0 hidden sm:block" />
      <Select
        value={gincanaAtivaId || undefined}
        onValueChange={setGincanaAtiva}
        disabled={loading}
      >
        <SelectTrigger className="h-9 w-40 sm:w-52" title="Gincana ativa">
          <SelectValue placeholder={loading ? 'Carregando...' : 'Selecionar gincana'} />
        </SelectTrigger>
        <SelectContent>
          {gincanasAcessiveis.map((g) => (
            <SelectItem key={g._id} value={g._id}>
              {g.nome}{g.ano ? ` (${g.ano})` : ''}
            </SelectItem>
          ))}
          {gincanasEncerradas.map((g) => (
            <SelectItem key={g._id} value={g._id} disabled>
              {g.nome}{g.ano ? ` (${g.ano})` : ''} — encerrada
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
