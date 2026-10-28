// Vídeos de demonstração do Arena, por playlist do YouTube (vídeos não
// listados). Os artigos de ajuda citam os vídeos pela chave deste objeto, em
// `videos: [...]`. `versao` é a versão do sistema em que a playlist foi gravada:
// uma versão nova da ajuda pode reaproveitar um vídeo antigo, e o cartão avisa
// que ele é de outra versão. Vídeo regravado? Crie uma chave nova em vez de
// trocar o id, para os artigos das versões antigas não mudarem sozinhos.

export const PLAYLISTS = {
  organizadores: {
    id: 'PLHBsfHxJh7u4',
    versao: '1.0.0',
    titulo: 'Organizadores da gincana',
    descricao: 'Gincanas, convites, usuários, equipes, provas, resultados e arbitragem.',
  },
  coordenadores: {
    id: 'PLSI4kARVQQ6U',
    versao: '1.0.0',
    titulo: 'Coordenadores das equipes',
    descricao: 'Inscrição de membros, titulares, migrações, empréstimos e feedbacks.',
  },
  participantes: {
    id: 'PLfYVcFlIEwhA',
    versao: '1.0.0',
    titulo: 'Participantes da gincana',
    descricao: 'Criar a conta, entrar nas provas, trocar de equipe e acompanhar tudo.',
  },
};

export const VIDEOS = {
  // Organizadores
  orgPrimeiroAcesso: { id: 'AgPssYdcusw', playlist: 'organizadores', episodio: 1, titulo: 'Primeiro acesso e Central de Informações', duracao: '5:14' },
  orgGincanas: { id: 'FYTtE-bVOfg', playlist: 'organizadores', episodio: 2, titulo: 'Gerenciamento de gincanas', duracao: '6:12' },
  orgConvites: { id: 'eh_j_oJu5BA', playlist: 'organizadores', episodio: 3, titulo: 'Gerenciamento de convites da gincana', duracao: '8:24' },
  orgUsuarios: { id: 'O-U0p1drgIo', playlist: 'organizadores', episodio: 4, titulo: 'Gerenciamento de usuários', duracao: '4:35' },
  orgEquipes: { id: 'Pnf-j6W5-8k', playlist: 'organizadores', episodio: 5, titulo: 'Gerenciamento de equipes', duracao: '5:12' },
  orgProvas1: { id: 'CXACGF3QIRM', playlist: 'organizadores', episodio: 6, titulo: 'Gerenciamento de provas (parte 1)', duracao: '10:33' },
  orgProvas2: { id: 'qR70m1kDGyc', playlist: 'organizadores', episodio: 7, titulo: 'Gerenciamento de provas (parte 2)', duracao: '9:39' },
  orgResultados: { id: '7eFJyKp4sN8', playlist: 'organizadores', episodio: 8, titulo: 'Lançamento das notas das provas', duracao: '8:53' },
  orgPenalidades: { id: 'E3lKl6napRM', playlist: 'organizadores', episodio: 9, titulo: 'Gerenciamento de penalidades', duracao: '5:08' },
  orgEmprestimos: { id: 'HZDkSj_mHoM', playlist: 'organizadores', episodio: 10, titulo: 'Gerenciamento de empréstimos', duracao: '6:35' },
  orgFeedbacks: { id: 'VuDtKRDH2Po', playlist: 'organizadores', episodio: 11, titulo: 'Gerenciamento de feedbacks', duracao: '5:05' },

  // Coordenadores
  coordPrimeiroAcesso: { id: '0hZZoa7gpYI', playlist: 'coordenadores', episodio: 1, titulo: 'Primeiro acesso e Central de Informações', duracao: '5:31' },
  coordMigracao: { id: 'LxwQWf-DZ28', playlist: 'coordenadores', episodio: 2, titulo: 'Migração de equipe dos membros', duracao: '4:16' },
  coordInscricao: { id: 'lolXkYyfDJQ', playlist: 'coordenadores', episodio: 3, titulo: 'Inscrição dos membros da equipe', duracao: '3:55' },
  coordTitulares: { id: 'SeaJ7WdKmtY', playlist: 'coordenadores', episodio: 4, titulo: 'Definição de titulares das provas', duracao: '3:55' },
  coordEmprestimos: { id: 'M6K9p2Y3AQY', playlist: 'coordenadores', episodio: 5, titulo: 'Gerenciamento de empréstimos', duracao: '10:06' },
  coordPanorama: { id: '02D__o03Y6M', playlist: 'coordenadores', episodio: 6, titulo: 'Panorama geral e feedbacks', duracao: '7:04' },

  // Participantes
  partConta: { id: 'i3djBCmjCl0', playlist: 'participantes', episodio: 1, titulo: 'Criação de conta e primeiro acesso', duracao: '5:28' },
  partMigracao: { id: 'qN9S3O1ShEQ', playlist: 'participantes', episodio: 2, titulo: 'Migração de equipe', duracao: '3:14' },
  partInscricao: { id: 'kENEmM6h8dQ', playlist: 'participantes', episodio: 3, titulo: 'Inscrição nas provas', duracao: '2:51' },
  partAcompanhamento: { id: 'NPUIDu78uG0', playlist: 'participantes', episodio: 4, titulo: 'Acompanhamento geral da gincana', duracao: '7:01' },
};

export const urlPlaylist = (chave) => `https://www.youtube.com/playlist?list=${PLAYLISTS[chave].id}`;

export const urlNoYoutube = (video) =>
  `https://www.youtube.com/watch?v=${video.id}&list=${PLAYLISTS[video.playlist].id}`;

// Domínio sem cookies do YouTube: nada é gravado no navegador antes do play.
export const urlIncorporada = (video) =>
  `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`;
