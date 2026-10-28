import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NOMES_PAPEIS } from './categorias';
import { PLAYLISTS, VIDEOS } from './videos';
import { VERSOES, VERSAO_ATUAL, buscarVersao, caminhoAjuda } from './versoes';
import { montarConteudo } from './conteudo';

// O conteúdo é editado à mão; estes testes pegam o erro de digitação que só
// apareceria como link quebrado, selo vazio ou print faltando na tela. Rodam
// para TODAS as versões: uma versão antiga continua publicada em /ajuda/v/.
describe.each(VERSOES.map((conteudo) => [conteudo.versao, conteudo]))('ajuda da versão %s', (versao, conteudo) => {
  const { artigos } = conteudo;

  it('tem slugs únicos e válidos para URL', () => {
    const slugs = artigos.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((slug) => expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });

  it('aponta para categorias, papéis e relacionados que existem', () => {
    artigos.forEach((artigo) => {
      expect(conteudo.buscarCategoria(artigo.categoria), artigo.slug).toBeDefined();
      expect(artigo.papeis.length, artigo.slug).toBeGreaterThan(0);
      artigo.papeis.forEach((papel) => expect(NOMES_PAPEIS[papel], `${artigo.slug}: ${papel}`).toBeDefined());
      (artigo.relacionados || []).forEach((rel) => {
        expect(conteudo.buscarArtigo(rel), `${artigo.slug} -> ${rel}`).toBeDefined();
        expect(rel).not.toBe(artigo.slug);
      });
    });
  });

  it('tem título, resumo e passo a passo em todo artigo', () => {
    artigos.forEach((artigo) => {
      expect(artigo.titulo, artigo.slug).toBeTruthy();
      expect(artigo.resumo, artigo.slug).toBeTruthy();
      expect(artigo.passos.length, artigo.slug).toBeGreaterThan(0);
    });
  });

  it('cita vídeos e prints que existem, com o arquivo do print no disco', () => {
    artigos.forEach((artigo) => {
      (artigo.videos || []).forEach((chave) => expect(VIDEOS[chave], `${artigo.slug}: ${chave}`).toBeDefined());
      (artigo.imagens || []).forEach((chave) => {
        expect(conteudo.imagens[chave], `${artigo.slug}: ${chave}`).toBeDefined();
        // O Vitest roda na raiz do client/, onde fica a pasta public/.
        const arquivo = resolve(process.cwd(), 'public', 'ajuda', versao, `${chave}.webp`);
        expect(existsSync(arquivo), arquivo).toBe(true);
      });
    });
  });

  it('aponta novidades para artigos que existem nesta versão', () => {
    conteudo.novidades.forEach((novidade) => {
      expect(['novo', 'mudou', 'corrigido']).toContain(novidade.tipo);
      if (novidade.artigo) expect(conteudo.buscarArtigo(novidade.artigo), novidade.artigo).toBeDefined();
    });
  });

  it('segue a ordem das categorias no Anterior/Próximo', () => {
    const { emOrdem } = conteudo;
    expect(emOrdem).toHaveLength(artigos.length);
    expect(conteudo.vizinhosDoArtigo(emOrdem[0].slug).anterior).toBeNull();
    expect(conteudo.vizinhosDoArtigo(emOrdem[0].slug).proximo).toBe(emOrdem[1]);
    expect(conteudo.vizinhosDoArtigo(emOrdem.at(-1).slug).proximo).toBeNull();
    expect(conteudo.vizinhosDoArtigo('nao-existe')).toEqual({ anterior: null, proximo: null });
  });
});

describe('registro de versões', () => {
  it('tem versões únicas no formato x.y.z, e a primeira é a atual', () => {
    const versoes = VERSOES.map((v) => v.versao);
    expect(new Set(versoes).size).toBe(versoes.length);
    versoes.forEach((v) => expect(v).toMatch(/^\d+\.\d+\.\d+$/));
    expect(VERSAO_ATUAL).toBe(VERSOES[0]);
  });

  it('dá à versão atual o endereço sem prefixo e às antigas /ajuda/v/<versao>', () => {
    expect(caminhoAjuda(VERSAO_ATUAL.versao)).toBe('/ajuda');
    expect(caminhoAjuda(VERSAO_ATUAL.versao, 'criar-conta')).toBe('/ajuda/criar-conta');
    expect(caminhoAjuda('0.9.0', 'criar-conta')).toBe('/ajuda/v/0.9.0/criar-conta');
    expect(buscarVersao('9.9.9')).toBeUndefined();
  });

  it('só usa vídeos de playlists conhecidas, com id do YouTube válido', () => {
    Object.entries(VIDEOS).forEach(([chave, video]) => {
      expect(PLAYLISTS[video.playlist], chave).toBeDefined();
      expect(video.id, chave).toMatch(/^[\w-]{11}$/);
    });
  });
});

describe('montarConteudo', () => {
  const conteudo = montarConteudo({
    versao: '0.0.1',
    artigos: [
      { slug: 'um', categoria: 'equipes', papeis: ['ALUNO'], titulo: 'Trocar de equipe', resumo: 'r', passos: ['Peça a migração'] },
      { slug: 'dois', categoria: 'provas', papeis: ['ALUNO'], titulo: 'Provas', resumo: 'r', passos: ['Clique em **Inscrever-se**'], bomSaber: ['Empréstimo não conta'] },
    ],
  });

  it('busca sem acentos e maiúsculas, também no corpo do artigo', () => {
    expect(conteudo.filtrarArtigos('EMPRESTIMO').map((a) => a.slug)).toEqual(['dois']);
    expect(conteudo.filtrarArtigos('  ')).toHaveLength(2);
    expect(conteudo.filtrarArtigos('xyzxyz')).toEqual([]);
  });

  it('esconde as categorias que ficaram sem artigo nesta versão', () => {
    expect(conteudo.categorias.map((c) => c.id)).toEqual(['equipes', 'provas']);
  });

  it('serve os prints da pasta da própria versão', () => {
    expect(conteudo.urlImagem('login')).toBe('/ajuda/0.0.1/login.webp');
  });
});
