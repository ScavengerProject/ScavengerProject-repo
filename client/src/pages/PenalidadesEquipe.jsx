import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";

import { penalidadesService } from "../services/api";
import { toast } from "../components/ui/toast";

export default function Penalidades() {
  const { usuario, logout } = useAuth();
  const [penalidades, setPenalidades] = useState([]);
  const [loading, setLoading] = useState(true);

  // O backend já devolve só as penalidades da equipe de quem está logado
  // (ou das equipes que o coordenador coordena).
  const carregarPenalidades = async () => {
    setLoading(true);
    try {
      const data = await penalidadesService.listarPenalidades();
      setPenalidades(data);
    } catch (err) {
      console.error(err);
      // O 'api.js' já lança um erro com a mensagem correta
      toast.error(`Erro ao carregar penalidades: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPenalidades();
  }, []);

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Penalidades da Equipe</h1>
          <p className="text-sm sm:text-base text-gray-600">Penalidades aplicadas à sua equipe nesta gincana</p>
        </div>

        {/* Conteúdo: tabela de penalidades */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          {loading ? (
            <p className="text-gray-600">Carregando penalidades...</p>
          ) : penalidades.length === 0 ? (
            <p className="text-gray-600">Sua equipe não recebeu nenhuma penalidade até o momento.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-2">Equipe</th>
                  <th className="p-2">Participante</th>
                  <th className="p-2">Pontos Removidos</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {penalidades.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="p-2">{p.equipe?.nome || "Equipe sem nome"}</td>
                    <td className="p-2">{p.participante?.nome || "-"}</td>
                    <td className="p-2">{p.pontos_removidos}</td>
                    <td className="p-2">{p.descricao}</td>
                    <td className="p-2">{new Date(p.criado_em).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
