import React from 'react';
import {
  Bell, CalendarBlank, CheckCircle, Clock, Trophy, UsersThree, ArrowRight,
} from '@phosphor-icons/react';

// Réplicas das telas reais do Arena, montadas com dados de exemplo. Servem de
// "print" da landing sem depender de banco e sem envelhecer como imagem: se o
// painel mudar (Dashboard.jsx), atualize aqui também. São decorativas para
// leitor de tela; quem descreve o produto é o texto ao lado.

const EQUIPES = [
  { posicao: 1, nome: 'Equipe Jaguar', pontos: '1.287', cor: '#f59e0b' },
  { posicao: 2, nome: 'Equipe Ipê', pontos: '1.164', cor: '#2563eb', minha: true },
  { posicao: 3, nome: 'Equipe Carcará', pontos: '1.059', cor: '#16a34a' },
  { posicao: 4, nome: 'Equipe Tucano', pontos: '948', cor: '#dc2626' },
];

const PROVAS = [
  { titulo: 'Arrecadação de alimentos', quando: 'Hoje, 14:30', status: 'Em andamento' },
  { titulo: 'Revezamento 4x100', quando: 'Amanhã, 09:00', status: 'Não iniciada' },
  { titulo: 'Quiz de ciências', quando: '03/11, 10:15', status: 'Não iniciada' },
];

function LinhaRanking({ equipe }) {
  const primeiro = equipe.posicao === 1;
  const fundo = equipe.minha
    ? 'bg-blue-50 border-blue-200'
    : primeiro ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200';
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${fundo}`}>
      <span className={`w-8 shrink-0 text-lg font-bold ${primeiro ? 'text-yellow-600' : 'text-gray-900'}`}>
        {equipe.posicao}º
      </span>
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: equipe.cor }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">{equipe.nome}</span>
        <span className="block text-xs text-gray-600">{equipe.pontos} pontos</span>
      </span>
      {primeiro && <Trophy size={20} weight="fill" className="shrink-0 text-yellow-500" />}
    </div>
  );
}

function CartaoNumero({ titulo, valor, descricao, icone: Icone, cor }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs sm:text-sm font-medium text-gray-600">{titulo}</span>
        <Icone size={18} className={`shrink-0 ${cor}`} />
      </div>
      <p className="mt-2 truncate text-xl sm:text-2xl font-bold text-gray-900">{valor}</p>
      <p className="truncate text-xs text-gray-500">{descricao}</p>
    </div>
  );
}

export function PainelReplica() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-gray-200 bg-gray-100 p-2 shadow-xl shadow-gray-900/10">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-left">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <span className="text-base font-bold text-blue-700">Arena</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700">
              E. E. Dom Pedro II
            </span>
            <span className="hidden sm:inline-flex rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700">
              Gincana 2026
            </span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-600">
              <Bell size={18} />
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs font-bold leading-none text-white">
                2
              </span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-lg sm:text-xl font-bold text-gray-900">Olá, Marina</p>
          <p className="text-xs sm:text-sm text-gray-600">Confira o desempenho da sua equipe e as próximas provas.</p>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CartaoNumero titulo="Minha Equipe" valor="Ipê" descricao="Ver informações" icone={UsersThree} cor="text-blue-600" />
            <CartaoNumero titulo="Provas Ativas" valor="2" descricao="provas em andamento" icone={Clock} cor="text-green-600" />
            <CartaoNumero titulo="Próximas Provas" valor="5" descricao="provas programadas" icone={CalendarBlank} cor="text-purple-600" />
            <CartaoNumero titulo="Posição no Ranking" valor="2º" descricao="Entre 6 equipes" icone={Trophy} cor="text-yellow-600" />
          </div>

          <div className="mt-4 grid lg:grid-cols-2 gap-3">
            <div className="hidden lg:block rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-base font-semibold text-gray-900">Andamento das Provas</p>
              <div className="mt-3 space-y-2">
                {PROVAS.map((prova) => (
                  <div key={prova.titulo} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{prova.titulo}</span>
                      <span className="block text-xs text-gray-600">{prova.quando}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      prova.status === 'Em andamento' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                    >
                      {prova.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-base font-semibold text-gray-900">Ranking de Equipes</p>
              <div className="mt-3 space-y-2">
                {EQUIPES.slice(0, 3).map((equipe) => <LinhaRanking key={equipe.nome} equipe={equipe} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trechos usados como prova ao lado de cada benefício ────────────────────

export function TrechoVagas() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Quiz de ciências</p>
          <p className="text-xs text-gray-500">03/11, 10:15 · Prova escrita</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Não iniciada</span>
      </div>
      <p className="mt-4 text-xs font-medium text-gray-500">Quem pode participar</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
          Ensino fundamental: 3 de 8 vaga(s)
        </span>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
          Ensino médio: sem vagas
        </span>
      </div>
      <span className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Inscrever-se</span>
    </div>
  );
}

export function TrechoRanking() {
  return (
    <div aria-hidden="true" className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {EQUIPES.map((equipe) => <LinhaRanking key={equipe.nome} equipe={equipe} />)}
    </div>
  );
}

export function TrechoNotificacoes() {
  const itens = [
    { tipo: 'Nova Prova', texto: 'Quiz de ciências foi publicada. Confira as vagas.', quando: 'há 12 min', nova: true },
    { tipo: 'Migração', texto: 'Seu pedido para entrar na Equipe Ipê foi aprovado.', quando: 'ontem, 18:42', nova: true },
    { tipo: 'Penalidade', texto: 'Sua equipe perdeu 15 pontos: atraso na entrega.', quando: '28/10', nova: false },
  ];
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">Notificações</span>
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">2</span>
      </div>
      <ul>
        {itens.map((item) => (
          <li key={item.tipo} className={`flex gap-3 border-b border-gray-100 px-4 py-3 last:border-0 ${item.nova ? 'bg-blue-50/60' : ''}`}>
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.nova ? 'bg-blue-600' : 'bg-transparent'}`} />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-gray-500">{item.tipo}</span>
              <span className="block text-sm text-gray-900">{item.texto}</span>
              <span className="block text-xs text-gray-500">{item.quando}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrechoMigracao() {
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">Minhas solicitações</p>
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            Tucano <ArrowRight size={14} className="text-gray-400" /> Ipê
          </span>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">PENDENTE</span>
        </div>
        <p className="mt-2 text-xs text-gray-600">Aguarde a decisão do coordenador</p>
      </div>
      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            Carcará <ArrowRight size={14} className="text-gray-400" /> Tucano
          </span>
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle size={12} weight="bold" /> APROVADA
          </span>
        </div>
      </div>
    </div>
  );
}
