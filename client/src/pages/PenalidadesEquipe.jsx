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

  // 2. FUNÇÃO ATUALIZADA (carregarPenalidades)
  const carregarPenalidades = async () => {
    setLoading(true);
    try {
      // Usa o serviço centralizado
      const data = await penalidadesService.listarPenalidades(); 
      console.log("Penalidades carregadas:", data);
      setPenalidades(data);
    } catch (err) {
      console.error(err);
      // O 'api.js' já lança um erro com a mensagem correta
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

  // 3. FUNÇÃO ATUALIZADA (handleSubmitPenalidade)
  const handleSubmitPenalidade = async (penalidade) => {
    try {
      // Usa o serviço centralizado
      await penalidadesService.criarPenalidade(penalidade); 

      alert("Penalidade criada com sucesso!");
      carregarPenalidades(); // Atualiza lista
    } catch (err) {
      console.error(err);
      alert(`Erro ao criar penalidade: ${err.message}`);
    }
    // Não precisa de 'finally' aqui, o modal é fechado pelo componente filho
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        {/* ... */}
      </div>

      {/* Conteúdo: tabela de penalidades */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        {loading ? (
          <p className="text-gray-600">Carregando penalidades...</p>
        ) : penalidades.length === 0 ? (
          <p className="text-gray-600">Nenhuma penalidade cadastrada até o momento.</p>
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
                {/* 4. CORREÇÃO DE DADOS (opcional mas recomendado) */}
                {/* O controller retorna 'equipe.nome', não 'equipe?.nome' */}
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