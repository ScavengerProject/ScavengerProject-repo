import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import ListaPenalidades from "../components/ListaPenalidades";

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
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-200">
          {loading ? (
            <p className="text-gray-600">Carregando penalidades...</p>
          ) : penalidades.length === 0 ? (
            <p className="text-gray-600">Sua equipe não recebeu nenhuma penalidade até o momento.</p>
          ) : (
            <ListaPenalidades penalidades={penalidades} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
