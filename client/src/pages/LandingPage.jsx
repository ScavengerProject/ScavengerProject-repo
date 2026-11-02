import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/geist';
import {
  ArrowRight, GraduationCap, Plus, Ticket, UserCirclePlus, ListChecks,
} from '@phosphor-icons/react';
import NavFlutuante from '../components/site/NavFlutuante';
import RodapeSite from '../components/site/RodapeSite';
import { CURVA, FOCO, FONTE_SITE, Revelar } from '../components/site/movimento';
import FraseRevelada from './landing/FraseRevelada';
import {
  PainelReplica, TrechoVagas, TrechoRanking, TrechoNotificacoes, TrechoMigracao,
} from './landing/Replicas';
import { VERSAO_ATUAL } from '../ajuda/versoes';

// Página de entrada para quem ainda não está logado (em '/' quem tem sessão vê
// o Dashboard). Público: quem recebeu o código de convite da escola. Ação
// principal: criar a conta. A fonte (Geist) e os ícones (Phosphor) valem só
// aqui; o resto do sistema segue com o visual próprio.

const BOTAO_PRINCIPAL = `inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-base font-semibold text-white shadow-sm transition duration-300 ${CURVA} hover:bg-blue-700 active:scale-[0.98] ${FOCO}`;

const NAV = {
  links: [
    { rotulo: 'Como funciona', href: '#como-funciona' },
    { rotulo: 'Dúvidas', href: '#duvidas' },
    { rotulo: 'Central de ajuda', to: '/ajuda' },
  ],
  acao: { rotulo: 'Entrar', to: '/login' },
  extrasMobile: [{ rotulo: 'Criar minha conta', to: '/inscricao', destaque: true }],
};

const BENEFICIOS = [
  {
    titulo: 'Veja a vaga antes de se inscrever',
    texto: 'Cada prova mostra quantas vagas ainda sobram para o seu grupo. Você sabe na hora se dá para entrar, sem perguntar para ninguém.',
    Trecho: TrechoVagas,
  },
  {
    titulo: 'Saiba como sua equipe está',
    texto: 'Quando a organização lança o resultado de uma prova, os pontos entram no ranking do painel, com a sua equipe destacada.',
    Trecho: TrechoRanking,
  },
  {
    titulo: 'Receba os avisos sem procurar',
    texto: 'Prova nova, penalidade e resposta de troca de equipe aparecem no sino do sistema e também chegam no seu email.',
    Trecho: TrechoNotificacoes,
  },
  {
    titulo: 'Troque de equipe pelo caminho certo',
    texto: 'O pedido vai direto para o coordenador da outra equipe, e a resposta fica registrada nas suas solicitações.',
    Trecho: TrechoMigracao,
  },
];

const PASSOS = [
  {
    icone: Ticket,
    titulo: 'Pegue o código com a escola',
    texto: 'A organização da gincana passa um código de convite. Ele já indica a sua escola e, às vezes, a sua turma.',
  },
  {
    icone: UserCirclePlus,
    titulo: 'Crie a conta e escolha a equipe',
    texto: 'O cadastro tem seis campos. Depois de entrar, você escolhe uma das equipes da gincana.',
  },
  {
    icone: ListChecks,
    titulo: 'Escolha as suas provas',
    texto: 'Faça a inscrição nas provas que têm vaga para você e acompanhe a pontuação da equipe pelo painel.',
  },
];

// Os títulos vêm da central de ajuda, para o link nunca apontar para um artigo
// renomeado ou removido.
const GUIAS = [
  {
    titulo: 'Para quem coordena uma equipe',
    artigos: ['definir-titulares', 'aprovar-migracoes', 'solicitar-membros'],
  },
  {
    titulo: 'Para quem organiza a gincana',
    artigos: ['gerenciar-gincanas', 'criar-provas', 'lancar-resultados'],
  },
];

const PERGUNTAS = [
  {
    pergunta: 'Onde consigo o código de convite?',
    resposta: 'Com a organização da gincana na sua escola. O código já indica a escola e, quando é de uma turma, a turma também.',
  },
  {
    pergunta: 'Meu cadastro precisa ser aprovado?',
    resposta: 'Depende do código. Com o código da sua turma, a conta fica liberada na hora. Com o código geral da escola, um administrador aprova o cadastro antes do primeiro acesso.',
  },
  {
    pergunta: 'Professores e pais também participam?',
    resposta: 'Sim. Muitas provas têm vagas para professores e para pais e mães. Nesses perfis, quem coloca você numa equipe é um administrador da gincana.',
  },
  {
    pergunta: 'Como sei se ainda tem vaga numa prova?',
    resposta: 'Cada prova mostra as vagas do seu grupo, como "3 de 8 vagas". Quando elas acabam, o botão de inscrição dá lugar ao motivo.',
  },
  {
    pergunta: 'Posso trocar de equipe?',
    resposta: 'Pode. Em Migrar de Equipe você pede a troca, e o coordenador da equipe de destino aprova ou recusa. A resposta aparece nas suas solicitações.',
  },
  {
    pergunta: 'Todo mundo vê os pontos da minha equipe?',
    resposta: 'A posição no ranking aparece para todos. Os pontos das outras equipes podem ficar ocultos, se a organização da gincana preferir.',
  },
  {
    pergunta: 'Mudei de escola. Preciso de outra conta?',
    resposta: 'Não. Entre com a conta que você já tem e use o código da escola nova em Código de Convite. A transferência vale depois que a escola nova aprovar.',
  },
  {
    pergunta: 'Esqueci minha senha. E agora?',
    resposta: 'Por enquanto a recuperação é feita pela escola: peça a um administrador da gincana para definir uma senha nova.',
  },
  {
    pergunta: 'Funciona no celular?',
    resposta: 'Funciona no navegador do celular, sem instalar nada.',
  },
];

function ChamadaConta({ claro = false }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${claro ? 'text-blue-100' : 'text-gray-500'}`}>
      <Link
        to="/inscricao"
        className={claro
          ? `inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-base font-semibold text-blue-700 shadow-sm transition duration-300 ${CURVA} hover:bg-blue-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600`
          : BOTAO_PRINCIPAL}
      >
        Criar minha conta
        <ArrowRight size={18} weight="bold" />
      </Link>
      <p className="text-sm text-pretty text-center">
        São seis campos e o código de convite da sua escola.{' '}
        <Link
          to="/login"
          className={`font-semibold underline underline-offset-4 ${claro ? 'text-white' : 'text-gray-900'} ${FOCO}`}
        >
          Já tenho conta
        </Link>
      </p>
    </div>
  );
}

function Titulo({ children, className = '' }) {
  return (
    <h2 className={`text-3xl sm:text-4xl font-semibold tracking-tight text-gray-950 text-balance ${className}`}>
      {children}
    </h2>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Arena · A gincana da sua escola num lugar só';
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased" style={FONTE_SITE}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
      >
        Pular para o conteúdo
      </a>
      <NavFlutuante {...NAV} />

      <main id="conteudo">
        {/* Topo */}
        <section className="px-4 pt-32 pb-16 sm:pt-40 sm:pb-24">
          <div className="mx-auto max-w-6xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600">
              <GraduationCap size={16} />
              Projeto desenvolvido na Unipampa
            </p>
            <h1 className="mx-auto mt-6 max-w-[680px] bg-linear-to-r from-black to-[#666666] bg-clip-text pb-2 text-5xl sm:text-6xl font-bold tracking-tight text-transparent">
              <span className="block text-balance">Sua equipe, suas provas</span>
              <span className="block text-balance">e o ranking da gincana.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-lg text-gray-600 text-pretty">
              O Arena é onde a gincana da sua escola acontece. Com o código de convite da escola,
              você entra numa equipe, se inscreve nas provas e acompanha a pontuação.
            </p>
            <div className="mt-8">
              <ChamadaConta />
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-5xl">
            <PainelReplica />
            <p className="mt-3 text-center text-sm text-gray-500">Painel do participante, com dados de exemplo.</p>
          </div>
        </section>

        {/* Benefícios, cada um com a tela que comprova */}
        <section className="bg-gray-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <Revelar>
              <Titulo className="max-w-[680px]">O que muda para quem participa</Titulo>
            </Revelar>
            <div className="mt-16 space-y-20">
              {BENEFICIOS.map(({ titulo, texto, Trecho }, i) => (
                <Revelar key={titulo} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                  <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                    <h3 className="text-2xl font-semibold tracking-tight text-gray-950 text-balance">{titulo}</h3>
                    <p className="mt-3 max-w-md text-base text-gray-600 text-pretty">{texto}</p>
                  </div>
                  <div className="mx-auto w-full max-w-md">
                    <Trecho />
                  </div>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* Frase de impacto */}
        <section className="px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <FraseRevelada
              linhas={[
                'Inscrição, pontuação e aviso',
                'no mesmo lugar, para todos.',
                'Sem lista no papel,',
                'sem recado perdido no grupo.',
              ]}
            />
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-24 bg-gray-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <Revelar>
              <Titulo>Do código de convite à primeira prova</Titulo>
            </Revelar>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
                <Revelar as="li" key={titulo} atraso={i * 100} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Icone size={22} />
                    </span>
                    <span className="text-sm font-semibold text-gray-400">Passo {i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-950">{titulo}</h3>
                  <p className="mt-2 text-base text-gray-600 text-pretty">{texto}</p>
                </Revelar>
              ))}
            </ol>
          </div>
        </section>

        {/* Quem coordena ou organiza */}
        <section className="px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <Revelar>
              <Titulo className="max-w-[680px]">Coordena uma equipe ou organiza a gincana?</Titulo>
              <p className="mt-4 max-w-[680px] text-lg text-gray-600 text-pretty">
                O Arena também tem as telas de quem escala os titulares, aprova trocas de equipe e lança
                os resultados. O passo a passo de cada uma está na central de ajuda.
              </p>
            </Revelar>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {GUIAS.map((guia, i) => (
                <Revelar key={guia.titulo} atraso={i * 100} className="rounded-2xl border border-gray-200 p-2">
                  <p className="px-4 pt-4 pb-2 text-base font-semibold text-gray-950">{guia.titulo}</p>
                  <ul>
                    {guia.artigos.map(VERSAO_ATUAL.buscarArtigo).filter(Boolean).map((artigo) => (
                      <li key={artigo.slug}>
                        <Link
                          to={`/ajuda/${artigo.slug}`}
                          className={`group flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-base text-gray-700 transition-colors duration-300 ${CURVA} hover:bg-gray-50 hover:text-gray-950 ${FOCO}`}
                        >
                          {artigo.titulo}
                          <ArrowRight size={16} className={`shrink-0 text-gray-400 transition-transform duration-300 ${CURVA} group-hover:translate-x-1`} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section id="duvidas" className="scroll-mt-24 bg-gray-50 px-4 py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_2fr]">
            <Revelar>
              <Titulo>Perguntas frequentes</Titulo>
              <p className="mt-4 text-base text-gray-600 text-pretty">
                Não achou a sua?{' '}
                <Link to="/ajuda" className={`font-semibold text-gray-900 underline underline-offset-4 ${FOCO}`}>
                  A central de ajuda
                </Link>{' '}
                tem o passo a passo de cada tela.
              </p>
            </Revelar>
            <Revelar className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
              {PERGUNTAS.map(({ pergunta, resposta }) => (
                <details key={pergunta} className="group">
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-base font-semibold text-gray-950 [&::-webkit-details-marker]:hidden ${FOCO} focus-visible:ring-inset`}
                  >
                    {pergunta}
                    <Plus size={18} className={`shrink-0 text-gray-500 transition-transform duration-300 ${CURVA} group-open:rotate-45`} />
                  </summary>
                  <p className="px-6 pb-4 text-base text-gray-600 text-pretty">{resposta}</p>
                </details>
              ))}
            </Revelar>
          </div>
        </section>

        {/* Chamada final, igual à do topo */}
        <section className="px-4 py-24">
          <Revelar className="mx-auto max-w-6xl rounded-2xl bg-blue-600 px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-[680px] text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance">
              Pegou o código com a escola?
            </h2>
            <p className="mx-auto mt-4 max-w-[680px] text-lg text-blue-100 text-pretty">
              Crie a conta e escolha a sua equipe para entrar na gincana.
            </p>
            <div className="mt-8">
              <ChamadaConta claro />
            </div>
          </Revelar>
        </section>
      </main>

      <RodapeSite />
    </div>
  );
}
