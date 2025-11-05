import React, { useState } from 'react';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { List, Plus, Trash2, GripVertical } from 'lucide-react';

/**
 * Componente para configurar sequenciamento de etapas dentro de uma prova
 * US14 - Inclui: lista de etapas ordenadas, se deve seguir a ordem
 */
export default function ProvaSequenciamentoForm({ sequenciamento, onChange }) {
  const [novaEtapa, setNovaEtapa] = useState('');
  
  const etapas = sequenciamento?.etapas || [];
  const exigirOrdem = sequenciamento?.exigir_ordem || false;

  const handleChange = (field, value) => {
    onChange({
      ...sequenciamento,
      [field]: value
    });
  };

  const adicionarEtapa = () => {
    if (novaEtapa.trim()) {
      const novaOrdem = etapas.length + 1;
      const novasEtapas = [
        ...etapas,
        {
          ordem: novaOrdem,
          descricao: novaEtapa.trim(),
          obrigatoria: true
        }
      ];
      handleChange('etapas', novasEtapas);
      setNovaEtapa('');
    }
  };

  const removerEtapa = (index) => {
    const novasEtapas = etapas.filter((_, i) => i !== index);
    // Reordena as etapas após remoção
    const etapasReordenadas = novasEtapas.map((etapa, i) => ({
      ...etapa,
      ordem: i + 1
    }));
    handleChange('etapas', etapasReordenadas);
  };

  const moverEtapa = (index, direcao) => {
    if (
      (direcao === 'cima' && index === 0) ||
      (direcao === 'baixo' && index === etapas.length - 1)
    ) {
      return;
    }

    const novasEtapas = [...etapas];
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    
    // Troca as etapas
    [novasEtapas[index], novasEtapas[novoIndex]] = [novasEtapas[novoIndex], novasEtapas[index]];
    
    // Reordena
    const etapasReordenadas = novasEtapas.map((etapa, i) => ({
      ...etapa,
      ordem: i + 1
    }));
    
    handleChange('etapas', etapasReordenadas);
  };

  const toggleObrigatoria = (index) => {
    const novasEtapas = etapas.map((etapa, i) => 
      i === index ? { ...etapa, obrigatoria: !etapa.obrigatoria } : etapa
    );
    handleChange('etapas', novasEtapas);
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <List className="h-5 w-5 text-purple-600" />
          Sequenciamento de Etapas
        </CardTitle>
        <CardDescription>
          Defina as etapas que compõem esta prova (ex: "ir até o ginásio", "pegar uma bola", "fazer um gol")
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar Nova Etapa */}
        <div>
          <Label className="text-gray-800 font-semibold">Adicionar Etapa</Label>
          <div className="flex gap-2 mt-2">
            <Input
              type="text"
              placeholder="Ex: Ir até o ginásio"
              value={novaEtapa}
              onChange={(e) => setNovaEtapa(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarEtapa())}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={adicionarEtapa} 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!novaEtapa.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista de Etapas */}
        {etapas.length > 0 && (
          <div>
            <Label className="text-gray-800 font-semibold mb-2 block">
              Etapas da Prova ({etapas.length})
            </Label>
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
              {etapas.map((etapa, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  {/* Ordem */}
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-700 font-bold rounded">
                    {etapa.ordem}
                  </div>

                  {/* Descrição */}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{etapa.descricao}</p>
                    {etapa.obrigatoria && (
                      <span className="text-xs text-purple-600">✓ Obrigatória</span>
                    )}
                  </div>

                  {/* Controles */}
                  <div className="flex items-center gap-1">
                    {/* Mover para cima */}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moverEtapa(index, 'cima')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      ↑
                    </Button>

                    {/* Mover para baixo */}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moverEtapa(index, 'baixo')}
                      disabled={index === etapas.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      ↓
                    </Button>

                    {/* Toggle Obrigatória */}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleObrigatoria(index)}
                      className="h-8 px-2 text-xs"
                    >
                      {etapa.obrigatoria ? 'Opcional' : 'Obrigatória'}
                    </Button>

                    {/* Remover */}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removerEtapa(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exigir Ordem */}
        {etapas.length > 1 && (
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="exigir_ordem"
              checked={exigirOrdem}
              onCheckedChange={(checked) => handleChange('exigir_ordem', checked)}
            />
            <div>
              <label
                htmlFor="exigir_ordem"
                className="text-sm font-medium text-gray-800 cursor-pointer"
              >
                Exigir conclusão na ordem sequencial
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Se marcado, o participante deve completar as etapas exatamente na ordem definida
              </p>
            </div>
          </div>
        )}

        {/* Resumo visual */}
        {etapas.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-purple-900 font-medium mb-2">Resumo do Sequenciamento:</p>
            <ul className="text-xs text-purple-800 space-y-1">
              <li>✓ {etapas.length} etapa(s) definida(s)</li>
              <li>✓ {etapas.filter(e => e.obrigatoria).length} obrigatória(s)</li>
              {exigirOrdem && <li>✓ Deve seguir a ordem sequencial</li>}
            </ul>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-purple-800 font-semibold mb-1">Sequência:</p>
              {etapas.map((etapa, i) => (
                <p key={i} className="text-xs text-purple-700">
                  {i + 1}. {etapa.descricao} {!etapa.obrigatoria && '(opcional)'}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

