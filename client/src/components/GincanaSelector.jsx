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
 */
export default function GincanaSelector() {
  const { minhasGincanas, gincanaAtivaId, setGincanaAtiva, loading } = useGincana();

  // Sem gincanas disponíveis: nada a exibir.
  if (!loading && (!minhasGincanas || minhasGincanas.length === 0)) {
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
          {minhasGincanas.map((g) => (
            <SelectItem key={g._id} value={g._id}>
              {g.nome}{g.ano ? ` (${g.ano})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
