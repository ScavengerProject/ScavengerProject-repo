import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";

export default function PenalidadesEquipe() {
  const navigate = useNavigate();

  // Voltar para página anterior
  const handleVoltar = () => {
    navigate(-1);
  };

  // Função de exemplo para marcar penalidade como visualizada
  const handleVisualizada = (id) => {
    console.log("Penalidade visualizada:", id);
  };

  // Lista de penalidades de exemplo (vazia por enquanto)
  const penalidades = [
    // Exemplo
    // { id: 1, descricao: "Atraso na entrega", data: "2025-11-08", status: "pendente" }
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Penalidades da Equipe</h1>
        </div>
      </div>

      {/* Lista de penalidades */}
      {penalidades.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center justify-center h-40">
          <AlertCircle className="text-red-700 mb-4" size={32} />
          <p className="text-gray-600 text-center">
            Nenhuma penalidade registrada para sua equipe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {penalidades.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col justify-between"
            >
              <div>
                <p className="text-gray-800 font-semibold mb-2">{p.descricao}</p>
                <p className="text-gray-500 text-sm mb-4">Data: {p.data}</p>
                <p className={`text-sm font-medium ${p.status === "pendente" ? "text-red-600" : "text-green-600"}`}>
                  {p.status === "pendente" ? "Pendente" : "Visualizada"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 flex items-center gap-2"
                onClick={() => handleVisualizada(p.id)}
              >
                <CheckCircle2 size={16} />
                Marcar como visualizada
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
