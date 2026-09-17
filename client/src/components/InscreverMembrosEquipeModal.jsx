import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { AlertCircle, Loader, UserPlus, Users } from "lucide-react";
import { provasService } from "../services/api";
import { toast } from "./ui/toast";

/**
 * Coordenador inscreve membros da própria equipe numa prova.
 *
 * Abre a partir do modal de detalhes da prova, ao lado de "Inscrever-se": é
 * onde o coordenador já está lendo os requisitos, e evita mais um item no menu
 * lateral. A lista mostra a equipe INTEIRA — quem não pode entrar aparece em
 * cinza com o motivo, porque uma lista curta e sem explicação se lê como bug
 * ("cadê meus alunos?"), não como uma regra da prova.
 */

// Rótulos curtos, na voz de quem está olhando a equipe. As mensagens do
// servidor são escritas para a autoinscrição ("verifique se a SUA turma...") e
// ficariam esquisitas aqui.
const MOTIVO_LABEL = {
  JA_INSCRITO: 'Já inscrito',
  GRUPO_NAO_PERMITIDO: 'Fora das cotas desta prova',
  GRUPO_INDETERMINADO: 'Sem turma definida',
  VAGAS_ESGOTADAS: 'Vagas do grupo esgotadas',
  SEM_VINCULO_ESCOLA: 'Sem vínculo ativo na escola',
  SEM_EQUIPE: 'Sem equipe',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
};

const rotuloDoMotivo = (codigo, fallback) => MOTIVO_LABEL[codigo] || fallback || 'Não elegível';

const InscreverMembrosEquipeModal = ({ prova, isOpen, onClose, onInscricaoSucesso }) => {
  const [carregando, setCarregando] = useState(false);
  const [erroCarga, setErroCarga] = useState(null);
  const [dados, setDados] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen && prova?._id) carregar();
    if (!isOpen) {
      setSelecionados([]);
      setErroCarga(null);
    }
  }, [isOpen, prova?._id]);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErroCarga(null);
      const data = await provasService.listarMembrosDaEquipeParaProva(prova._id);
      setDados(data);
      setSelecionados([]);
    } catch (error) {
      setDados(null);
      setErroCarga(error.message || 'Não foi possível carregar os membros da sua equipe.');
    } finally {
      setCarregando(false);
    }
  };

  const membros = dados?.membros || [];
  const cotas = dados?.cotas || [];

  // Vagas que ainda restam em cada grupo DEPOIS de contar a seleção atual.
  // É o que impede o coordenador de marcar 4 pessoas para 2 vagas e levar duas
  // recusas no envio — o limite aparece antes, na própria lista.
  const restantesPorGrupo = useMemo(() => {
    const mapa = {};
    cotas.forEach((cota) => { mapa[cota.grupo] = cota.restantes; });
    membros
      .filter((m) => selecionados.includes(String(m.id)))
      .forEach((m) => {
        if (m.grupo && mapa[m.grupo] !== undefined) mapa[m.grupo] -= 1;
      });
    return mapa;
  }, [cotas, membros, selecionados]);

  const podeSelecionar = (membro) => {
    if (!membro.elegivel) return false;
    if (selecionados.includes(String(membro.id))) return true;
    return (restantesPorGrupo[membro.grupo] ?? 0) > 0;
  };

  const alternar = (membro) => {
    const id = String(membro.id);
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  };

  const selecionarTodosPossiveis = () => {
    const restantes = {};
    cotas.forEach((cota) => { restantes[cota.grupo] = cota.restantes; });

    const escolhidos = [];
    membros.forEach((m) => {
      if (!m.elegivel) return;
      if ((restantes[m.grupo] ?? 0) <= 0) return;
      restantes[m.grupo] -= 1;
      escolhidos.push(String(m.id));
    });
    setSelecionados(escolhidos);
  };

  const handleInscrever = async () => {
    if (selecionados.length === 0) return;
    try {
      setEnviando(true);
      const resposta = await provasService.inscreverMembrosDaEquipe(prova._id, selecionados);

      const falhas = resposta.falhas || [];
      if (falhas.length === 0) {
        toast.success(`${resposta.inscritos.length} membro(s) inscrito(s).`);
      } else {
        toast.success(`${resposta.inscritos.length} inscrito(s). ${falhas.length} não pôde(m): `
          + falhas.map((f) => `${f.nome} (${rotuloDoMotivo(f.code, f.message)})`).join(', '));
      }

      await carregar();
      if (onInscricaoSucesso) onInscricaoSucesso();
    } catch (error) {
      // Nenhum entrou (422): o servidor manda o motivo de cada um em `erros`.
      const detalhes = error.erros?.length ? ` ${error.erros.join(' | ')}` : '';
      toast.error(`${error.message || 'Erro ao inscrever membros.'}${detalhes}`);
    } finally {
      setEnviando(false);
    }
  };

  const totalElegiveis = dados?.total_elegiveis || 0;
  const nenhumElegivel = !carregando && !erroCarga && membros.length > 0 && totalElegiveis === 0;
  const equipeVazia = !carregando && !erroCarga && membros.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] bg-white border-gray-300 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Inscrever membros da equipe
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {dados?.equipe?.nome
              ? <>Equipe <span className="font-medium text-gray-800">{dados.equipe.nome}</span> em "{prova?.titulo}".</>
              : <>Selecione quem da sua equipe deve participar de "{prova?.titulo}".</>}
          </DialogDescription>
        </DialogHeader>

        {/* Vagas restantes por grupo: o coordenador precisa saber o teto ANTES
            de escolher, não depois de levar uma recusa. */}
        {cotas.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {cotas.map((cota) => {
              const restam = restantesPorGrupo[cota.grupo] ?? cota.restantes;
              return (
                <Badge
                  key={cota.grupo}
                  className={restam > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}
                >
                  {cota.label}: {restam > 0 ? `${restam} de ${cota.limite} vaga(s)` : 'sem vagas'}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {carregando && (
            <div className="flex items-center justify-center py-10 text-gray-600">
              <Loader className="h-5 w-5 animate-spin mr-2" />
              Carregando membros da equipe...
            </div>
          )}

          {erroCarga && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-900 mb-2">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Não foi possível carregar</h4>
              </div>
              <p className="text-sm text-red-800 mb-3">{erroCarga}</p>
              <Button variant="outline" size="sm" onClick={carregar}>Tentar novamente</Button>
            </div>
          )}

          {equipeVazia && (
            <p className="text-sm text-gray-600 text-center py-10">
              Sua equipe ainda não tem outros membros para inscrever.
            </p>
          )}

          {nenhumElegivel && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 text-amber-900 mb-1">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Nenhum membro se encaixa nesta prova</h4>
              </div>
              <p className="text-sm text-amber-800">
                O motivo de cada um está na lista abaixo.
              </p>
            </div>
          )}

          {!carregando && !erroCarga && membros.length > 0 && (
            <ul className="space-y-2">
              {membros.map((membro) => {
                const id = String(membro.id);
                const marcado = selecionados.includes(id);
                const habilitado = podeSelecionar(membro);
                const bloqueadoPorCota = membro.elegivel && !habilitado;

                return (
                  <li
                    key={id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      membro.elegivel
                        ? marcado
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Checkbox
                      id={`membro-${id}`}
                      checked={marcado}
                      disabled={!habilitado || enviando}
                      onCheckedChange={() => alternar(membro)}
                    />
                    <label
                      htmlFor={`membro-${id}`}
                      className={`flex-1 min-w-0 ${habilitado && !enviando ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`block font-medium truncate ${membro.elegivel ? 'text-gray-900' : 'text-gray-500'}`}>
                        {membro.nome}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {membro.turma || 'Turma não definida'}
                      </span>
                    </label>

                    {!membro.elegivel && (
                      <Badge
                        className={membro.motivo_codigo === 'JA_INSCRITO'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'}
                        title={membro.motivo || undefined}
                      >
                        {rotuloDoMotivo(membro.motivo_codigo)}
                      </Badge>
                    )}
                    {bloqueadoPorCota && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Vagas preenchidas pela seleção
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} disabled={enviando}>Fechar</Button>
              {totalElegiveis > 0 && (
                <Button variant="ghost" onClick={selecionarTodosPossiveis} disabled={enviando}>
                  Selecionar possíveis
                </Button>
              )}
            </div>
            <Button
              onClick={handleInscrever}
              disabled={selecionados.length === 0 || enviando}
              className="bg-blue-600 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {enviando
                ? 'Inscrevendo...'
                : `Inscrever ${selecionados.length || ''} ${selecionados.length === 1 ? 'membro' : 'membros'}`.trim()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InscreverMembrosEquipeModal;
