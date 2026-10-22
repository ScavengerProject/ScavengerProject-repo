import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { penalidadesService } from "../services/api";
import { toast } from "./ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Gavel, CheckCircle, XCircle } from "lucide-react";

export default function ModalCriarPenalidade({ open, onClose, onSubmit }) {
  const [equipes, setEquipes] = useState([]);
  const [membros, setMembros] = useState([]);
  const [form, setForm] = useState({
    equipeId: "",
    participanteId: "",
    pontos: 0,
    descricao: "",
  });
  const [pontosEquipe, setPontosEquipe] = useState(0);

  useEffect(() => {
    if (open) {
      penalidadesService
        .listarEquipes()
        .then((data) => {
          const equipesFormatadas = (data || []).map((e) => ({
            id: e.id,
            nome: e.nome,
            pontos_acumulados: e.pontos_acumulados || 0,
          }));
          setEquipes(equipesFormatadas);
        })
        .catch((err) => console.error("Erro ao carregar equipes:", err));
    }
  }, [open]);

  const handleEquipeChange = async (equipeId) => {
    setForm((prev) => ({ ...prev, equipeId, participanteId: "" }));

    if (!equipeId) {
      setMembros([]);
      setPontosEquipe(0);
      return;
    }

    try {
      const membrosData = await penalidadesService.listarMembrosDaEquipe(equipeId);
      setMembros(membrosData || []);

      const equipeSelecionada = equipes.find((e) => e.id === equipeId);
      if (equipeSelecionada) setPontosEquipe(equipeSelecionada.pontos_acumulados || 0);
    } catch (err) {
      console.error("Erro ao carregar membros ou pontos:", err);
      setMembros([]);
      setPontosEquipe(0);
    }
  };

  const handleParticipanteChange = (usuarioId) => {
    setForm((prev) => ({ ...prev, participanteId: usuarioId || "" }));
  };

  const handlePontosChange = (value) => {
    const n = parseInt(value, 10);
    if (isNaN(n)) {
      setForm((prev) => ({ ...prev, pontos: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, pontos: Math.min(Math.max(0, n), pontosEquipe) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipeId) {
      toast.error("Selecione uma equipe para criar a penalidade.");
      return;
    }

    const penalidade = {
      equipeId: form.equipeId,
      participanteId: form.participanteId || null,
      pontos: Number(form.pontos) || 0,
      descricao: form.descricao,
    };

    try {
      const res = await penalidadesService.criarPenalidade(penalidade);

      // Verifica se o retorno existe e tem os dados esperados
      if (!res || !res.pontos_restantes) {
        console.warn("Resposta inesperada do servidor:", res);
      }

      // Atualiza os pontos da equipe na tela
      setPontosEquipe(res.pontos_restantes || 0);
      setEquipes((prev) =>
        prev.map((e) =>
          e.id === form.equipeId ? { ...e, pontos_acumulados: res.pontos_restantes || 0 } : e
        )
      );

      toast.success("Penalidade criada com sucesso!");
      if (typeof onSubmit === "function") onSubmit(res);
      onClose();
    } catch (error) {
      // Só mostra erro se for realmente erro
      console.error("Erro ao criar penalidade:", error);
      toast.error(error?.message || "Erro ao criar penalidade.");
    }
  };

  // Usa o Dialog compartilhado: o modal feito à mão não tinha margem nem
  // rolagem, e no celular o teclado escondia a descrição e os botões.
  return (
    <Dialog open={open} onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="bg-white">
        <DialogHeader className="border-b-2 border-gray-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-semibold">
            <Gavel size={22} />
            Criar Penalidade
          </DialogTitle>
          <DialogDescription className="sr-only">
            Escolha a equipe, os pontos a remover e o motivo da penalidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Equipe *</Label>
            <Select onValueChange={handleEquipeChange} value={form.equipeId}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.equipeId && (
            <div className="mt-1">
              {pontosEquipe > 0 ? (
                <li className="flex items-center gap-1 text-blue-700 text-sm list-none">
                  <CheckCircle className="h-3 w-3 translate-y-[1px]" />
                  <span>Equipe possui {pontosEquipe} ponto{pontosEquipe !== 1 ? "s" : ""}</span>
                </li>
              ) : (
                <li className="flex items-center gap-1 text-red-600 text-sm list-none">
                  <XCircle className="h-3 w-3 translate-y-[1px]" />
                  <span>Não possui pontos</span>
                </li>
              )}
            </div>
          )}

          <div>
            <Label>Participante (opcional)</Label>
            <Select onValueChange={handleParticipanteChange} value={form.participanteId} disabled={!membros.length}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={membros.length ? "Selecione o participante" : "Selecione uma equipe primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {membros.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Pontos a remover</Label>
            <Input
              type="number"
              min="0"
              max={pontosEquipe || undefined}
              value={form.pontos}
              onChange={(e) => handlePontosChange(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              placeholder="Descreva o motivo da penalidade..."
              value={form.descricao}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
            />
          </div>

        </div>

        <DialogFooter className="pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white">Confirmar Penalidade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}