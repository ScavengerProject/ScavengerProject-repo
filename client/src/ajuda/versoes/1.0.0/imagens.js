// Prints da versão 1.0.0, tirados do manual do administrador
// (docs/manual-administrador-v1.0.0.pdf), num ambiente de demonstração com
// pessoas fictícias. Os arquivos ficam em client/public/ajuda/1.0.0/<chave>.webp.
// largura/altura evitam que a página pule enquanto a imagem carrega.

export const IMAGENS = {
  login: { largura: 809, altura: 724, legenda: 'Tela de entrada, com email e senha.' },
  'tela-administrador': { largura: 1600, altura: 896, legenda: 'A tela depois de entrar: menu lateral, gincana ativa, sino de notificações, conta e Sair.' },
  'central-informacoes-admin': { largura: 1600, altura: 935, legenda: 'Central de Informações vista pelo administrador: totais, andamento das provas e ranking.' },
  'gincanas-lista': { largura: 1600, altura: 935, legenda: 'Lista de edições, com os botões de cada uma.' },
  'gincanas-nova': { largura: 768, altura: 761, legenda: 'Formulário de nova edição.' },
  'convites-lista': { largura: 1600, altura: 935, legenda: 'Um código de turma e um código público, com os botões de cada um.' },
  'convites-novo': { largura: 768, altura: 509, legenda: 'Gerando um código de convite.' },
  'vinculos-pendentes': { largura: 1600, altura: 935, legenda: 'Um cadastro aguardando decisão. A turma precisa ser escolhida para liberar o Aprovar.' },
  'usuarios-lista': { largura: 1600, altura: 2067, legenda: 'Totais por situação, filtros e a lista de contas da escola.' },
  'usuarios-novo': { largura: 1008, altura: 704, legenda: 'Formulário de nova conta.' },
  'equipes-lista': { largura: 1600, altura: 935, legenda: 'Cada cartão mostra a cor, os pontos, os coordenadores e os botões da equipe.' },
  'equipes-adicionar-membro': { largura: 675, altura: 389, legenda: 'Adicionando alguém à equipe.' },
  'equipes-coordenadores': { largura: 750, altura: 668, legenda: 'Limite de coordenadores e a lista atual.' },
  'provas-lista': { largura: 1600, altura: 3058, legenda: 'Provas da edição. No topo, o interruptor de pontuação no ranking e o botão de nova prova.' },
  'provas-dados-datas': { largura: 900, altura: 1817, legenda: 'Dados básicos e datas da prova.' },
  'provas-pontuacao-unidade': { largura: 900, altura: 1007, legenda: 'Pontuação por unidade com teto e uma categoria de bônus.' },
  'provas-vagas': { largura: 900, altura: 1007, legenda: 'Vagas por grupo.' },
  'resultados-lancamento': { largura: 1152, altura: 1242, legenda: 'Lançamento de uma prova por posição, com categoria de bônus.' },
  'resultados-prova-concluida': { largura: 1050, altura: 1137, legenda: 'Resultado final da prova, com a opção Ocultar Pontos (Admin).' },
  'alunos-por-prova': { largura: 1600, altura: 1784, legenda: 'Escalação das equipes, com um aluno emprestado.' },
  'emprestimos-pedidos': { largura: 1600, altura: 935, legenda: 'Um pedido na fila: equipe, prova, quantidade, turmas desejadas e motivo.' },
  'emprestimos-aprovar': { largura: 672, altura: 576, legenda: 'Aprovando um pedido de empréstimo.' },
  'emprestimos-ativos': { largura: 1600, altura: 935, legenda: 'Empréstimo ativo: aluno, equipe de origem e de destino, e a prova.' },
  'penalidades-nova': { largura: 768, altura: 927, legenda: 'Penalidade de 15 pontos com o participante apontado.' },
  'penalidades-lista': { largura: 1600, altura: 935, legenda: 'Penalidades registradas.' },
  'feedbacks-lista': { largura: 1600, altura: 1501, legenda: 'Um feedback pendente e um já analisado, com a resposta.' },
  'feedbacks-responder': { largura: 825, altura: 585, legenda: 'Respondendo um feedback.' },
  'notificacoes-sino': { largura: 1600, altura: 842, legenda: 'O sino mostra os 5 avisos mais recentes.' },
};

