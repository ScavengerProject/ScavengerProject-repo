import React from "react";

const formatarData = (data) => new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

// Lista de penalidades das telas de admin e de equipe: tabela a partir de `md`
// e cartões abaixo disso, onde as 5 colunas não cabiam.
export default function ListaPenalidades({ penalidades }) {
  return (
    <>
      <ul className="md:hidden space-y-3">
        {penalidades.map((p) => (
          <li key={p.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 break-words">{p.equipe?.nome || "Equipe sem nome"}</p>
                {p.participante?.nome && (
                  <p className="text-sm text-gray-600 break-words">{p.participante.nome}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold text-red-700">-{p.pontos_removidos} pts</span>
            </div>
            {p.descricao && <p className="mt-2 text-sm text-gray-800 break-words">{p.descricao}</p>}
            <p className="mt-2 text-xs text-gray-500">{formatarData(p.criado_em)}</p>
          </li>
        ))}
      </ul>

      <table className="hidden md:table w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="p-2 text-sm">Equipe</th>
            <th className="p-2 text-sm">Participante</th>
            <th className="p-2 text-sm">Pontos</th>
            <th className="p-2 text-sm">Descrição</th>
            <th className="p-2 text-sm">Data</th>
          </tr>
        </thead>
        <tbody>
          {penalidades.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="p-2 text-sm">{p.equipe?.nome || "Equipe sem nome"}</td>
              <td className="p-2 text-sm">{p.participante?.nome || "-"}</td>
              <td className="p-2 text-sm font-semibold">{p.pontos_removidos}</td>
              <td className="p-2 text-sm">{p.descricao}</td>
              <td className="p-2 text-sm whitespace-nowrap">{formatarData(p.criado_em)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
