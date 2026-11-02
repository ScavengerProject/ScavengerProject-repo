import React, { useEffect, useState } from 'react';
import { AlertTriangle, Mail, PartyPopper, Trophy } from 'lucide-react';
import { gincanasService } from '../services/api';
import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog';

const MEDALHA = { 1: 'text-amber-600', 2: 'text-slate-500', 3: 'text-orange-700' };

const plural = (n, singular, pluralizado) => `${n} ${n === 1 ? singular : pluralizado}`;

function Classificacao({ classificacao }) {
  return (
    <ol className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
      {classificacao.map((equipe) => (
        <li key={equipe.equipe_id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className={`w-8 shrink-0 text-right font-bold tabular-nums ${MEDALHA[equipe.posicao] || 'text-gray-500'}`}>
            {equipe.posicao}º
          </span>
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full border border-gray-200"
            style={{ backgroundColor: equipe.cor || '#ccc' }}
          />
          <span className="min-w-0 flex-1 font-medium text-gray-900 wrap-break-word">{equipe.nome}</span>
          <span className="shrink-0 tabular-nums text-gray-600">{equipe.pontos} pts</span>
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-xs ${
              equipe.total_coordenadores > 0 ? 'text-gray-500' : 'text-amber-700'
            }`}
            title={equipe.total_coordenadores > 0
              ? `${plural(equipe.total_coordenadores, 'coordenador recebe', 'coordenadores recebem')} o email`
              : 'Sem coordenador: ninguém desta equipe recebe o email'}
          >
            <Mail size={12} aria-hidden="true" />
            <span className="sr-only">Emails:</span>
            {equipe.total_coordenadores}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Encerramento "oficial" de uma gincana: mostra a prévia do que será congelado
 * (GET /previa-encerramento), pede confirmação e chama POST /encerrar.
 *
 * Fluxo em três telas dentro do mesmo diálogo: prévia -> encerrando ->
 * concluído (com o atalho para a cerimônia). Ao concluir, `onEncerrada` avisa a
 * página — é ela que recarrega as listas, porque a gincana encerrada pode ser
 * a ativa, e mantê-la no escopo faria a próxima requisição levar
 * GINCANA_ENCERRADA.
 *
 * @param {{ gincana: object|null, onOpenChange: (aberto: boolean) => void,
 *           onEncerrada: (resposta: object) => Promise<void>|void,
 *           onIniciarCerimonia: (gincanaId: string) => void }} props
 */
export default function EncerrarGincanaDialog({ gincana, onOpenChange, onEncerrada, onIniciarCerimonia }) {
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState(null);
  const [encerrando, setEncerrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!gincana) return undefined;
    let cancelado = false;
    setPrevia(null);
    setErro(null);
    setResultado(null);
    gincanasService.previaEncerramento(gincana._id)
      .then((dados) => { if (!cancelado) setPrevia(dados); })
      .catch((error) => { if (!cancelado) setErro(error.message || 'Não foi possível carregar a prévia.'); });
    return () => { cancelado = true; };
  }, [gincana]);

  const confirmar = async () => {
    setEncerrando(true);
    setErro(null);
    try {
      const resposta = await gincanasService.encerrar(gincana._id);
      setResultado(resposta);
      await onEncerrada?.(resposta);
    } catch (error) {
      setErro(error.message || 'Não foi possível encerrar a gincana.');
    } finally {
      setEncerrando(false);
    }
  };

  // Durante o POST o diálogo não fecha: fechar no meio deixaria o admin sem
  // saber se encerrou (e um segundo clique em "Encerrar" no card).
  const aoMudarAbertura = (aberto) => {
    if (!aberto && encerrando) return;
    onOpenChange(aberto);
  };

  const semEquipes = previa && previa.classificacao.length === 0;

  return (
    <Dialog open={Boolean(gincana)} onOpenChange={aoMudarAbertura}>
      <DialogContent className="sm:max-w-xl">
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="text-amber-600" size={22} aria-hidden="true" />
                {resultado.ja_encerrada ? 'Esta gincana já estava encerrada' : 'Gincana encerrada!'}
              </DialogTitle>
              <DialogDescription>
                {resultado.ja_encerrada
                  ? 'O resultado anunciado continua o mesmo, e nenhum email foi reenviado.'
                  : `A classificação final foi congelada. ${
                    resultado.coordenadores_notificados > 0
                      ? `${plural(resultado.coordenadores_notificados, 'coordenador vai', 'coordenadores vão')} receber o resultado por email.`
                      : 'Nenhuma equipe tem coordenador, então nenhum email foi enviado.'
                  }`}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Agora é a hora da cerimônia: ela abre em tela cheia, pronta para o telão, e revela o pódio do 3º ao 1º lugar.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => onIniciarCerimonia(gincana._id)}
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 inline-flex items-center gap-2"
              >
                <Trophy size={18} aria-hidden="true" /> Iniciar cerimônia
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Encerrar {gincana?.nome}?</DialogTitle>
              <DialogDescription>
                Esta é a classificação que será congelada como resultado final. Correções de pontos feitas depois
                não mudam o resultado anunciado.
              </DialogDescription>
            </DialogHeader>

            {!previa && !erro && (
              <p role="status" className="py-6 text-center text-sm text-gray-500">Calculando a classificação...</p>
            )}

            {semEquipes && (
              <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-600">
                Esta gincana não tem equipes para classificar.
              </p>
            )}

            {previa && !semEquipes && (
              <div className="space-y-3">
                <Classificacao classificacao={previa.classificacao} />

                <p className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <Mail size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {previa.total_emails > 0
                      ? `${plural(previa.total_emails, 'coordenador vai', 'coordenadores vão')} receber por email a posição da equipe, com uma mensagem para cada colocação.`
                      : 'Nenhuma equipe tem coordenador: ninguém vai receber email.'}
                    {previa.equipes_sem_coordenador.length > 0 && previa.total_emails > 0 && (
                      <> Sem coordenador, e portanto sem email: {previa.equipes_sem_coordenador.join(', ')}.</>
                    )}
                  </span>
                </p>

                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    A gincana sai do ar para os participantes: provas, resultados e notificações deixam de abrir.
                    Ela pode ser reativada depois, mas os emails enviados não voltam.
                  </span>
                </p>
              </div>
            )}

            {erro && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={encerrando}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmar}
                disabled={!previa || semEquipes || encerrando}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {encerrando ? 'Encerrando...' : 'Encerrar e congelar resultado'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
