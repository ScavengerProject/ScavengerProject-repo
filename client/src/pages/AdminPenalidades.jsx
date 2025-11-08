import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";

export default function Penalidades() {
  const navigate = useNavigate();

  // Função de exemplo para voltar à página anterior
  const handleVoltar = () => {
    navigate(-1);
  };

  // Função de exemplo para criar nova penalidade
  const handleCriarPenalidade = () => {
    navigate("/admin/penalidades"); // rota de criação
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ArrowLeft
            className="text-gray-700 cursor-pointer"
            size={24}
            onClick={handleVoltar}
          />
          <h1 className="text-2xl font-bold text-gray-900">Penalidades</h1>
        </div>
        <Button
          onClick={handleCriarPenalidade}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          <Plus size={16} />
          Criar Penalidade
        </Button>
      </div>

      {/* Lista de penalidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Exemplo de card de penalidade vazio */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center justify-center h-40">
          <AlertCircle className="text-red-700 mb-4" size={32} />
          <p className="text-gray-600 text-center">Nenhuma penalidade registrada ainda.</p>
        </div>
      </div>
    </div>
  );
}
