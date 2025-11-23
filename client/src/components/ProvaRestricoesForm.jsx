import React from 'react';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Componente para configurar restrições de participação de uma prova
 * US14 - Restrições incluem: limite de tentativas, tempo máximo, permitir reenvio
 */
export default function ProvaRestricoesForm({ restricoes, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...restricoes,
      [field]: value
    });
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Restrições de Participação
        </CardTitle>
        <CardDescription>
          Configure limites e regras para realização da prova
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Limite de Tentativas */}
        <div>
          <Label className="flex items-center gap-2 text-gray-800">
            <RefreshCw className="h-4 w-4" />
            Limite de Tentativas
          </Label>
          <Input
            type="number"
            min="1"
            placeholder="Deixe vazio para ilimitado"
            value={restricoes?.limite_tentativas || ''}
            onChange={(e) => handleChange('limite_tentativas', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantas vezes o participante pode tentar realizar a prova
          </p>
        </div>

        {/* Tempo Máximo */}
        <div>
          <Label className="flex items-center gap-2 text-gray-800">
            <Clock className="h-4 w-4" />
            Tempo Máximo (minutos)
          </Label>
          <Input
            type="number"
            min="1"
            placeholder="Deixe vazio para sem limite"
            value={restricoes?.tempo_maximo_minutos || ''}
            onChange={(e) => handleChange('tempo_maximo_minutos', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tempo máximo para conclusão da prova após o início
          </p>
        </div>

        {/* Permitir Reenvio */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="permitir_reenvio"
            checked={restricoes?.permitir_reenvio !== false}
            onCheckedChange={(checked) => handleChange('permitir_reenvio', checked)}
          />
          <label
            htmlFor="permitir_reenvio"
            className="text-sm font-medium text-gray-800 cursor-pointer"
          >
            Permitir reenvio de respostas
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Se desmarcado, o participante não poderá alterar suas respostas após o envio
        </p>
      </CardContent>
    </Card>
  );
}

