import React from 'react';
import { School } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useEscola } from '../hooks/useEscola';

/**
 * Seletor da escola ativa (tenant) exibido na navbar, à esquerda do
 * GincanaSelector. Troca o escopo de todas as requisições (header X-Escola-Id).
 *
 * Fica oculto quando o usuário tem apenas uma escola — o caso comum de quem não
 * atua em mais de uma — para não poluir a navbar com um seletor de uma opção só.
 */
export default function EscolaSelector() {
  const { minhasEscolas, escolaAtivaId, setEscolaAtiva, loading } = useEscola();

  if (!loading && (!minhasEscolas || minhasEscolas.length <= 1)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <School size={18} className="text-emerald-700 shrink-0 hidden sm:block" />
      <Select
        value={escolaAtivaId || undefined}
        onValueChange={setEscolaAtiva}
        disabled={loading}
      >
        <SelectTrigger className="h-9 w-40 sm:w-52" title="Escola ativa">
          <SelectValue placeholder={loading ? 'Carregando...' : 'Selecionar escola'} />
        </SelectTrigger>
        <SelectContent>
          {minhasEscolas.map((e) => (
            <SelectItem key={e._id} value={e._id}>
              {e.nome}{e.cidade ? ` — ${e.cidade}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
