// Busca de provas por título e descrição, sem diferenciar maiúsculas nem
// acentos ("revezamento" acha "Revezamento", "agua" acha "Água"). Feita no
// client porque as telas de provas já recebem a lista inteira da gincana.

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const provaCorrespondeBusca = (prova, termo) => {
  const busca = normalizar(termo);
  if (!busca) return true;
  return normalizar(prova?.titulo).includes(busca) || normalizar(prova?.descricao).includes(busca);
};

export const filtrarProvasPorBusca = (provas, termo) =>
  (provas || []).filter((prova) => provaCorrespondeBusca(prova, termo));
