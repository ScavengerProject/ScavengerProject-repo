import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { CheckSquare } from 'lucide-react';
import { provasService } from '../services/api';
import { Checkbox } from './ui/checkbox';

// ✅ Turmas fixas baseadas no modelo de dados (enum do Usuario)
const TURMAS_DISPONIVEIS = [
  { value: 'EF - 1º Ano', label: 'EF - 1º Ano' },
  { value: 'EF - 2º Ano', label: 'EF - 2º Ano' },
  { value: 'EF - 3º Ano', label: 'EF - 3º Ano' },
  { value: 'EF - 4º Ano', label: 'EF - 4º Ano' },
  { value: 'EF - 5º Ano', label: 'EF - 5º Ano' },
  { value: 'EF - 6º Ano', label: 'EF - 6º Ano' },
  { value: 'EF - 7º Ano', label: 'EF - 7º Ano' },
  { value: 'EF - 8º Ano', label: 'EF - 8º Ano' },
  { value: 'EF - 9º Ano', label: 'EF - 9º Ano' },
  { value: 'EM - 1º Ano', label: 'EM - 1º Ano' },
  { value: 'EM - 2º Ano', label: 'EM - 2º Ano' },
  { value: 'EM - 3º Ano', label: 'EM - 3º Ano' },
];

/**
 * Componente para configurar critérios de elegibilidade de uma prova
 * US14 - Inclui: turmas permitidas, pré-requisitos
 */
export default function ProvaElegibilidadeForm({ criterios, onChange, provaAtualId }) {
  const [provasDisponiveis, setProvasDisponiveis] = useState([]);
  const [loadingProvas, setLoadingProvas] = useState(true);

  useEffect(() => {
    carregarProvas();
  }, []);

  const carregarProvas = async () => {
    try {
      setLoadingProvas(true);
      const response = await provasService.listar();
      // Filtra para não incluir a prova atual (se estiver editando)
      const filtradas = (response || []).filter(p => p._id !== provaAtualId);
      setProvasDisponiveis(filtradas);
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
    } finally {
      setLoadingProvas(false);
    }
  };

  const handleChange = (field, value) => {
    onChange({
      ...criterios,
      [field]: value
    });
  };

  const toggleTurma = (turma) => {
    const turmas = criterios?.turmas_permitidas || [];
    if (turmas.includes(turma)) {
      handleChange('turmas_permitidas', turmas.filter(t => t !== turma));
    } else {
      handleChange('turmas_permitidas', [...turmas, turma]);
    }
  };

  const togglePreRequisito = (provaId) => {
    const preRequisitos = criterios?.pre_requisitos_prova_ids || [];
    if (preRequisitos.includes(provaId)) {
      handleChange('pre_requisitos_prova_ids', preRequisitos.filter(id => id !== provaId));
    } else {
      handleChange('pre_requisitos_prova_ids', [...preRequisitos, provaId]);
    }
  };

  const turmasSelecionadas = criterios?.turmas_permitidas || [];
  const preRequisitos = criterios?.pre_requisitos_prova_ids || [];

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-600" />
          Critérios de Elegibilidade
        </CardTitle>
        <CardDescription>
          Defina quem pode participar desta prova (deixe vazio para permitir todos)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Turmas Permitidas */}
        <div>
          <Label className="text-gray-800 font-semibold mb-3 block">
            Turmas Permitidas ({turmasSelecionadas.length} selecionada{turmasSelecionadas.length !== 1 ? 's' : ''})
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            Selecione as turmas que podem participar (vazio = todas as turmas)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
            {TURMAS_DISPONIVEIS.map((turma) => (
              <div key={turma.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`turma-${turma.value}`}
                  checked={turmasSelecionadas.includes(turma.value)}
                  onCheckedChange={() => toggleTurma(turma.value)}
                />
                <label
                  htmlFor={`turma-${turma.value}`}
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  {turma.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Pré-requisitos (Provas Anteriores) */}
        <div>
          <Label className="text-gray-800 font-semibold mb-3 block">
            Pré-requisitos - Provas Obrigatórias ({preRequisitos.length} selecionada{preRequisitos.length !== 1 ? 's' : ''})
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            Selecione as provas que devem ser concluídas antes desta (vazio = sem pré-requisitos)
          </p>
          <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
            {loadingProvas ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Carregando provas disponíveis...
              </div>
            ) : provasDisponiveis.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Nenhuma prova disponível como pré-requisito
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {provasDisponiveis.map((prova) => (
                  <div
                    key={prova._id}
                    className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                      preRequisitos.includes(prova._id)
                        ? 'bg-green-100 border border-green-300'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      id={`prova-${prova._id}`}
                      checked={preRequisitos.includes(prova._id)}
                      onCheckedChange={() => togglePreRequisito(prova._id)}
                      className="mt-1"
                    />
                    <label
                      htmlFor={`prova-${prova._id}`}
                      className="flex-1 cursor-pointer select-none"
                    >
                      <span className="text-sm font-medium text-gray-900 block">{prova.titulo}</span>
                      {prova.descricao && (
                        <span className="text-xs text-gray-600 block mt-1">{prova.descricao}</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo visual */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900 font-medium mb-2">Resumo dos Critérios:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            {turmasSelecionadas.length > 0 ? (
              <li>✓ Restrito a {turmasSelecionadas.length} turma(s) específica(s)</li>
            ) : (
              <li>✓ Todas as turmas podem participar</li>
            )}
            {preRequisitos.length > 0 ? (
              <li>✓ Exige conclusão de {preRequisitos.length} prova(s) anterior(es)</li>
            ) : (
              <li>✓ Sem pré-requisitos (qualquer pessoa pode fazer)</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}



