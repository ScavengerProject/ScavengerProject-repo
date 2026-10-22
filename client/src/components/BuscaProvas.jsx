import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";

// Campo de busca das telas de provas (participante e admin).
export default function BuscaProvas({ valor, onChange, className = "" }) {
  return (
    <div className={`relative w-full sm:max-w-sm ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        type="text"
        enterKeyHint="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar prova por título ou descrição"
        aria-label="Buscar prova"
        className="bg-white border-gray-300 pl-9 pr-9"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
