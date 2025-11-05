import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/Input";
import { Checkbox } from "./ui/checkbox";
import { Users, Infinity, CheckCircle, XCircle, Lock } from "lucide-react";

const ProvaParticipantesForm = ({ requisitos, onChange }) => {
  const [semLimite, setSemLimite] = useState(false);
  const [cotas, setCotas] = useState({
    ALUNOS_FUNDAMENTAL: 0,
    ALUNOS_MEDIO: 0,
    PROFESSORES: 0,
    'PAI/MÃE': 0,
  });

  // Inicializar valores quando o componente monta ou requisitos mudam
  useEffect(() => {
    if (requisitos && typeof requisitos === 'object') {
      const novosValores = {
        ALUNOS_FUNDAMENTAL: Number(requisitos.ALUNOS_FUNDAMENTAL) || 0,
        ALUNOS_MEDIO: Number(requisitos.ALUNOS_MEDIO) || 0,
        PROFESSORES: Number(requisitos.PROFESSORES) || 0,
        'PAI/MÃE': Number(requisitos['PAI/MÃE']) || 0,
      };
      setCotas(novosValores);

      // Verificar se é "sem limite" (todos maiores que 999)
      const todosMaiorQue999 = Object.values(novosValores).every(v => v >= 999);
      setSemLimite(todosMaiorQue999);
    }
  }, [requisitos]);

  const handleCheckboxChange = (checked) => {
    setSemLimite(checked);
    
    if (checked) {
      // Sem limite = 999 para todos (valor alto que representa "ilimitado")
      const novosValores = {
        ALUNOS_FUNDAMENTAL: 999,
        ALUNOS_MEDIO: 999,
        PROFESSORES: 999,
        'PAI/MÃE': 999,
      };
      setCotas(novosValores);
      onChange(novosValores);
    } else {
      // Com limite = zerar tudo (admin precisa configurar manualmente)
      const novosValores = {
        ALUNOS_FUNDAMENTAL: 0,
        ALUNOS_MEDIO: 0,
        PROFESSORES: 0,
        'PAI/MÃE': 0,
      };
      setCotas(novosValores);
      onChange(novosValores);
    }
  };

  const handleCotaChange = (grupo, valor) => {
    const valorNumerico = Math.max(0, parseInt(valor) || 0);
    const novosValores = {
      ...cotas,
      [grupo]: valorNumerico,
    };
    setCotas(novosValores);
    onChange(novosValores);
  };

  const tiposParticipantes = [
    { key: 'ALUNOS_FUNDAMENTAL', label: 'Alunos do Ensino Fundamental', color: 'text-blue-600' },
    { key: 'ALUNOS_MEDIO', label: 'Alunos do Ensino Médio', color: 'text-green-600' },
    { key: 'PROFESSORES', label: 'Professores', color: 'text-purple-600' },
    { key: 'PAI/MÃE', label: 'Pais/Mães', color: 'text-orange-600' },
  ];

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Participantes e Cotas
        </CardTitle>
        <CardDescription>
          Configure quantos participantes de cada tipo podem participar desta prova
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checkbox para sem limite */}
        <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Checkbox
            id="sem-limite"
            checked={semLimite}
            onCheckedChange={handleCheckboxChange}
          />
          <div className="flex-1">
            <Label 
              htmlFor="sem-limite" 
              className="text-blue-900 font-semibold cursor-pointer flex items-center gap-2"
            >
              <Infinity className="h-5 w-5" />
              Permitir participação ilimitada (sem restrição de vagas)
            </Label>
            <p className="text-xs text-blue-700 mt-1">
              Todos os tipos de usuários poderão participar sem limite de vagas
            </p>
          </div>
        </div>

        {/* Inputs de cotas individuais */}
        {!semLimite && (
          <>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Configure quantas vagas estão disponíveis para cada tipo de participante.
                <span className="font-semibold text-gray-900"> Se definir 0, esse tipo não poderá participar.</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tiposParticipantes.map((tipo) => (
                <div key={tipo.key} className="space-y-2">
                  <Label htmlFor={tipo.key} className={`font-medium ${tipo.color}`}>
                    {tipo.label}
                  </Label>
                  <Input
                    id={tipo.key}
                    type="number"
                    min="0"
                    value={cotas[tipo.key]}
                    onChange={(e) => handleCotaChange(tipo.key, e.target.value)}
                    placeholder="0 = não permitido"
                    className="bg-white border-gray-300"
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {cotas[tipo.key] === 0 
                      ? (
                        <>
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span>Não poderá participar</span>
                        </>
                      )
                      : (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>Até {cotas[tipo.key]} participante(s)</span>
                        </>
                      )
                    }
                  </p>
                </div>
              ))}
            </div>

            {/* Resumo visual */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Resumo das Vagas:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {tiposParticipantes.map((tipo) => (
                  <div key={tipo.key} className="flex justify-between items-center">
                    <span className="text-gray-600">{tipo.label.split(' ')[0]}:</span>
                    <span className={`font-semibold flex items-center gap-1 ${cotas[tipo.key] > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cotas[tipo.key] === 0 ? (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Bloqueado</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>{cotas[tipo.key]} vagas</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total de vagas:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {Object.values(cotas).reduce((sum, val) => sum + val, 0)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {semLimite && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-800">
                <strong>Participação ilimitada ativada.</strong> Todos os tipos de usuários poderão participar desta prova sem restrição de vagas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProvaParticipantesForm;

