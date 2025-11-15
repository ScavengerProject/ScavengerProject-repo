import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Input } from "./ui/Input";
import { Label } from "./ui/label";
import { Loader, Trash2, Plus, Trophy } from "lucide-react";
import { equipesService, resultadosService } from "../services/api";
import { toast } from "./ui/toast";

const LancarResultadoModal = ({ prova, isOpen, onClose }) => {
  const [tipoPontuacao, setTipoPontuacao] = useState('RANKING');
  const [equipes, setEquipes] = useState([]); 
  const [carregando, setCarregando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultados, setResultados] = useState([{ equipe_id: '', valor: '1' }]); // Padrão para ranking

  // Carrega dados ao abrir
  useEffect(() => {
    if (isOpen && prova) {
      // 1. Define o tipo de pontuação
      const regras = prova.pontuacao || {};
      const tipoDetectado = regras.pontos_por_unidade ? 'PROPORCIONAL' : 'RANKING';
      setTipoPontuacao(tipoDetectado);

      // 2. Reseta o formulário
      setResultados([{ equipe_id: '', valor: tipoDetectado === 'RANKING' ? '1' : '' }]);
      
      // 3. Carrega equipes e resultados existentes
      const carregarDados = async () => {
        setCarregando(true);
        try {
          const [equipesData, resultadosData] = await Promise.all([
            equipesService.listarEquipesGincana(),
            resultadosService.listarResultadosDaProva(prova._id)
          ]);

          setEquipes(equipesData || []);

          if (resultadosData && resultadosData.length > 0) {
            // Se for ranking, ordena pela posição (valor)
            if (tipoDetectado === 'RANKING') {
              resultadosData.sort((a, b) => Number(a.valor) - Number(b.valor));
            }
            const dadosFormatados = resultadosData.map(r => ({
              equipe_id: r.equipe_id, 
              valor: r.valor.toString()
            }));
            setResultados(dadosFormatados);
          } else {
            // Se não houver dados, reseta para a primeira linha correta
            setResultados([{ equipe_id: '', valor: tipoDetectado === 'RANKING' ? '1' : '' }]);
          }

        } catch (error) {
          toast.error("Erro ao carregar dados da prova.");
        } finally {
          setCarregando(false);
        }
      };
      
      carregarDados();
    }
  }, [isOpen, prova]);

  // Handler para mudar valores nas linhas
  const handleResultadoChange = (index, campo, valor) => {
    const novosResultados = [...resultados];
    novosResultados[index][campo] = valor;
    setResultados(novosResultados);
  };

  // Adicionar uma nova linha de resultado
  const adicionarLinha = () => {
    if (tipoPontuacao === 'RANKING') {
      // Adiciona a próxima posição
      const proximaPosicao = (resultados.length + 1).toString();
      setResultados([...resultados, { equipe_id: '', valor: proximaPosicao }]);
    } else {
      // Adiciona uma linha em branco
      setResultados([...resultados, { equipe_id: '', valor: '' }]);
    }
  };

  // Remover uma linha de resultado
  const removerLinha = (index) => {
    if (resultados.length <= 1) {
       // Não remove a última linha, apenas a limpa
       if (tipoPontuacao === 'RANKING') {
         setResultados([{ equipe_id: '', valor: '1' }]);
       } else {
         setResultados([{ equipe_id: '', valor: '' }]);
       }
       return;
    }

    let novosResultados = resultados.filter((_, i) => i !== index);
    
    // Se for ranking, re-indexa as posições
    if (tipoPontuacao === 'RANKING') {
      novosResultados = novosResultados.map((res, i) => ({
        ...res,
        valor: (i + 1).toString()
      }));
    }
    setResultados(novosResultados);
  };

  // Handler para submeter (sem mudanças)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resultadosValidos = resultados.filter(
        r => r.equipe_id && r.valor.toString().trim() !== ''
      );
      if (resultadosValidos.length === 0) {
        toast.error("Adicione pelo menos um resultado válido.");
        setSubmitting(false);
        return;
      }
      const dadosFormatados = resultadosValidos.map(r => ({
        equipe_id: r.equipe_id,
        valor: (tipoPontuacao === 'RANKING' ? r.valor.toString() : Number(r.valor))
      }));
      const body = { tipo: tipoPontuacao, resultados: dadosFormatados };
      await resultadosService.lancarResultados(prova._id, body);
      toast.success("Resultados lançados com sucesso!");
      onClose();
    } catch (error) {
      toast.error(error.message || "Erro ao salvar resultados.");
      setSubmitting(false);
    }
  };


  if (!prova) return null;

  const idsEquipesSelecionadas = resultados.map(r => r.equipe_id).filter(Boolean);
  const nomeTipoPontuacao = tipoPontuacao === 'RANKING' 
    ? 'Por Posição' 
    : 'Por Unidade';

  const regrasPontuacao = prova.pontuacao || {};
  const pontosPorUnidade = Number(regrasPontuacao.pontos_por_unidade) || 0;
  const nomeUnidade = regrasPontuacao.nome_unidade || 'unidade';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-white border-gray-300 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            Lançar Resultados: <span className="font-normal">{prova.titulo}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Insira os resultados das equipes para esta prova. Isso irá calcular e aplicar os pontos.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center justify-center h-48">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-700">Carregando dados...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            
            {/* 1. TIPO DE LANÇAMENTO */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-100 border border-gray-300 rounded-md">
              <div className="col-span-1">
                <Label className="text-gray-900 font-medium my-auto">
                  Tipo de Lançamento:
                </Label>
              </div>
              <div className="col-span-2">
                <p className="text-gray-900 font-semibold my-auto">
                  {nomeTipoPontuacao}
                </p>
              </div>
            </div>

            {/* 2. LINHAS DE RESULTADOS */}
            <div className="space-y-4">
              <Label className="text-gray-900 font-medium">Resultados</Label>

              {tipoPontuacao === 'RANKING' && resultados.map((res, index) => {
                const equipesDisponiveis = equipes.filter(
                  (eq) => eq._id === res.equipe_id || !idsEquipesSelecionadas.includes(eq._id)
                );
                return (
                  <div key={index} className="flex items-end gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    
                    {/* CAMPO DE POSIÇÃO */}
                    <div className="w-28 grid gap-1.5">
                      <Label className="text-sm">Posição</Label>
                      <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="font-bold text-gray-800">{index + 1}º Lugar</span>
                      </div>
                    </div>

                    {/* SELETOR DE EQUIPE */}
                    <div className="flex-1 grid gap-1.5">
                      <Label htmlFor={`equipe-${index}`} className="text-sm">Equipe</Label>
                      <Select
                        value={res.equipe_id}
                        onValueChange={(valor) => handleResultadoChange(index, 'equipe_id', valor)}
                        disabled={submitting}
                      >
                        <SelectTrigger id={`equipe-${index}`} className="bg-white border-gray-300">
                          <SelectValue placeholder="Selecione uma equipe" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          {equipesDisponiveis.map(eq => (
                            <SelectItem key={eq._id} value={eq._id} style={{ color: eq.cor || 'black' }}>
                              {eq.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* BOTÃO DE REMOVER */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removerLinha(index)}
                      disabled={resultados.length <= 1 || submitting}
                      className="border-gray-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
              
              {tipoPontuacao === 'PROPORCIONAL' && resultados.map((res, index) => {
                const equipesDisponiveis = equipes.filter(
                  (eq) => eq._id === res.equipe_id || !idsEquipesSelecionadas.includes(eq._id)
                );
                
                // --- CÁLCULO EM TEMPO REAL ---
                const quantidade = Number(res.valor) || 0;
                const totalCalculado = quantidade * pontosPorUnidade;
                // -----------------------------

                return (
                  <div key={index} className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    
                    {/* Seletor de Equipe (LINHA 1, COL 1) */}
                    <div className="col-span-1 grid gap-1.5">
                      <Label htmlFor={`equipe-${index}`} className="text-sm">Equipe</Label>
                      <Select
                        value={res.equipe_id}
                        onValueChange={(valor) => handleResultadoChange(index, 'equipe_id', valor)}
                        disabled={submitting}
                      >
                        <SelectTrigger id={`equipe-${index}`} className="bg-white border-gray-300">
                          <SelectValue placeholder="Selecione uma equipe" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          {equipesDisponiveis.map(eq => (
                            <SelectItem key={eq._id} value={eq._id} style={{ color: eq.cor || 'black' }}>
                              {eq.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Input de Quantidade (LINHA 1, COL 2) */}
                    <div className="col-span-1 grid gap-1.5">
                      <Label htmlFor={`valor-${index}`} className="text-sm">
                        Quantidade de {nomeUnidade}
                      </Label>
                      <Input
                        id={`valor-${index}`}
                        type="number"
                        min="0"
                        value={res.valor} 
                        onChange={(e) => handleResultadoChange(index, 'valor', e.target.value)}
                        placeholder="Ex: 50"
                        className="bg-white border-gray-300"
                        disabled={submitting}
                      />
                    </div>
                    
                    {/* Total de Pontos (LINHA 2, COL 1) */}
                    <div className="col-span-1 grid gap-1.5">
                      <Label className="text-sm">Total de Pontos</Label>
                      <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-200 rounded-md flex items-center justify-between">
                        <span className="font-bold text-gray-800 text-base">{totalCalculado} pts</span>
                        <div className="text-xs text-gray-600 ml-1 text-right">
                          ({quantidade} x {pontosPorUnidade} pts)
                        </div>
                      </div>
                    </div>
                    
                    {/* Botão de Remover (LINHA 2, COL 2) */}
                    <div className="col-span-1 flex items-end justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removerLinha(index)}
                        disabled={resultados.length <= 1 || submitting}
                        className="border-gray-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botão de Adicionar Linha */}
            <Button
              type="button"
              variant="outline"
              onClick={adicionarLinha}
              disabled={submitting}
              className="border-gray-300 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              {tipoPontuacao === 'RANKING' ? 'Adicionar Posição' : 'Adicionar Linha'}
            </Button>

            {/* Footer */}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4 mr-2" />
                )}
                Salvar Resultados
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LancarResultadoModal;