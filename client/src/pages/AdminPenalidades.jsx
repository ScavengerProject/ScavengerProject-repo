import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import { Button } from "../components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import ModalCriarPenalidade from "../components/ModalCriarPenalidade";
import { penalidadesService } from "../services/api";

export default function Penalidades() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [penalidades, setPenalidades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para carregar todas as penalidades
  const carregarPenalidades = async () => {
    setLoading(true);
    try {
      const data = await penalidadesService.listarPenalidades();
      console.log("Penalidades carregadas:", data);
      setPenalidades(data);
    } catch (err) {
      console.error(err);
      alert(`Erro ao carregar penalidades: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    carregarPenalidades();
  }, []);

  const handleCriarPenalidade = () => {
    setOpenModal(true);
  };

  const handleSubmitPenalidade = async (penalidade) => {
    try {
      carregarPenalidades(); // Atualiza lista
    } catch (err) {
      console.error(err);
      alert(`Erro ao criar penalidade: ${err.message}`);
    }
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Gerenciar Penalidades
          </h1>

          <Button
            onClick={handleCriarPenalidade}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <Plus size={16} />
            Criar Penalidade
          </Button>
        </div>

      {/* Conteúdo: tabela de penalidades */}
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-gray-600">Carregando penalidades...</p>
        ) : penalidades.length === 0 ? (
          <p className="text-gray-600">Nenhuma penalidade cadastrada até o momento.</p>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-2 text-xs sm:text-sm">Equipe</th>
                  <th className="p-2 text-xs sm:text-sm">Participante</th>
                  <th className="p-2 text-xs sm:text-sm">Pontos</th>
                  <th className="p-2 text-xs sm:text-sm">Descrição</th>
                  <th className="p-2 text-xs sm:text-sm">Data</th>
                </tr>
              </thead>
              <tbody>
                {penalidades.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="p-2 text-xs sm:text-sm">{p.equipe?.nome || "Equipe sem nome"}</td>
                    <td className="p-2 text-xs sm:text-sm">{p.participante?.nome || "-"}</td>
                    <td className="p-2 text-xs sm:text-sm font-semibold">{p.pontos_removidos}</td>
                    <td className="p-2 text-xs sm:text-sm">{p.descricao}</td>
                    <td className="p-2 text-xs sm:text-sm whitespace-nowrap">{new Date(p.criado_em).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de criação */}
      <ModalCriarPenalidade
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleSubmitPenalidade}
      />
      </div>
    </MainLayout>
  );
}