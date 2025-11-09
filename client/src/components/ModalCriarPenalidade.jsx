import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/Input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { penalidadesService } from "../services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { X, Gavel } from "lucide-react";

export default function ModalCriarPenalidade({ open, onClose, onSubmit }) {
  const [equipes, setEquipes] = useState([]);
  const [membros, setMembros] = useState([]);
  const [form, setForm] = useState({
    equipeId: "",
    participanteId: "",
    pontos: 1,
    descricao: "",
  });

  
  useEffect(() => {
    if (open) {
      penalidadesService
        .listarEquipes()
        .then((data) => {
          const equipesFormatadas = (data || []).map((e) => ({
            id: e.id || e._id || e.equipe_id?._id,
            nome: e.nome || e.equipe_id?.nome || "Sem nome",
          }));
          setEquipes(equipesFormatadas);
        })
        .catch((err) => console.error("Erro ao carregar equipes:", err));
    }
  }, [open]);

  // Quando escolher uma equipe, buscar os membros
  const handleEquipeChange = async (equipeId) => {
    setForm((prev) => ({ ...prev, equipeId, participanteId: "" }));

    if (!equipeId) {
      setMembros([]);
      return;
    }

    try {
      // Agora usando o service centralizado (rota correta)
      const data = await penalidadesService.listarMembrosDaEquipe(equipeId);
      setMembros(data || []);
    } catch (err) {
      console.error("Erro ao carregar membros:", err);
      setMembros([]);
    }
  };


  // Gera nome automático da penalidade (ex: PEN-20251108-xxxx)
  const gerarNomePenalidade = () => {
    const data = new Date();
    const aleatorio = Math.floor(1000 + Math.random() * 9000);
    return `PEN-${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}${String(
      data.getDate()
    ).padStart(2, "0")}-${aleatorio}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipeId) {
      alert("Selecione uma equipe para criar a penalidade.");
      return;
    }

    const penalidade = {
      nome: gerarNomePenalidade(),
      equipeId: form.equipeId,
      participanteId: form.participanteId || null,
      pontos: Number(form.pontos) || 1,
      descricao: form.descricao,
    };

    try {
      const res = await fetch("/api/penalidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(penalidade),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Erro ao criar penalidade");
      }
      const data = await res.json();
      console.log("✅ Penalidade criada:", data);
      alert("Penalidade criada com sucesso!");

      if (typeof onSubmit === "function") onSubmit(data);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar penalidade: " + (error.message || ""));
    }
  };

  // garantia: componente controlado para participante também
  const handleParticipanteChange = async (usuarioId) => {
    setForm((prev) => ({ ...prev, participanteId: usuarioId || "" }));

    if (!usuarioId) return;

    try {
      const data = await penalidadesService.participanteSelecionado(usuarioId);
      console.log("📌 Participante selecionado:", data);
    } catch (err) {
      console.error("Erro ao buscar participante selecionado:", err);
    }
  };




  // input de pontos: garantir número >=1
  const handlePontosChange = (value) => {
    const n = parseInt(value, 10);
    setForm((prev) => ({ ...prev, pontos: isNaN(n) ? "" : Math.max(1, n) }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg bg-white shadow-xl rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700 text-lg font-semibold">
            <Gavel size={22} />
            Criar Penalidade
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </CardHeader>

        <CardContent className="mt-4 space-y-4">
          {/* Seleção de equipe */}
          <div>
            <Label>Equipe *</Label>
            <Select onValueChange={handleEquipeChange} value={form.equipeId}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de participante */}
          <div>
            <Label>Participante (opcional)</Label>
            <Select
              onValueChange={handleParticipanteChange}
              value={form.participanteId}
              disabled={!membros.length}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue
                  placeholder={
                    membros.length ? "Selecione o participante" : "Selecione uma equipe primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {membros.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>

          {/* Pontos a remover */}
          <div>
            <Label>Pontos a remover</Label>
            <Input
              type="number"
              min="1"
              value={form.pontos}
              onChange={(e) => handlePontosChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              placeholder="Descreva o motivo da penalidade..."
              value={form.descricao}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white">
              Confirmar Penalidade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}