import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../components/MainLayout";
import { Button } from "../components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import ModalCriarPenalidade from "../components/ModalCriarPenalidade";
import ListaPenalidades from "../components/ListaPenalidades";
import { penalidadesService } from "../services/api";
import { toast } from "../components/ui/toast";

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
      setPenalidades(data);
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao carregar penalidades: ${err.message}`);
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

  // O modal ja cria a penalidade e notifica o sucesso; aqui so recarregamos a lista.
  const handleSubmitPenalidade = () => {
    carregarPenalidades();
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
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
            <ListaPenalidades penalidades={penalidades} />
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