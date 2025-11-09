import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import ModalCriarPenalidade from "../components/ModalCriarPenalidade";

export default function Penalidades() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);

  const handleCriarPenalidade = () => {
    setOpenModal(true);
  };

  const handleSubmitPenalidade = async (penalidade) => {
    try {
      const res = await fetch("/api/penalidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(penalidade),
      });

      if (res.ok) {
        alert("Penalidade criada com sucesso!");
      } else {
        const err = await res.json().catch(() => null);
        alert("Erro ao criar penalidade: " + (err?.message || res.statusText));
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão com o servidor.");
    }
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Cabeçalho com botão voltar e título */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handleVoltar}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 rounded-lg p-2 transition"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
            <span className="text-base font-medium">Voltar</span>
          </button>

          {/* Título principal */}
          <h1 className="text-2xl font-bold text-gray-900 ml-4">
            Gerenciar Penalidades
          </h1>
        </div>

        <Button
          onClick={handleCriarPenalidade}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          <Plus size={16} />
          Criar Penalidade
        </Button>
      </div>

      {/* Conteúdo (placeholder) */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex items-center justify-center h-40">
        <p className="text-gray-600">Nenhuma penalidade cadastrada até o momento.</p>
      </div>

      {/* Modal de criação */}
      <ModalCriarPenalidade
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleSubmitPenalidade}
      />
    </div>
  );
}
