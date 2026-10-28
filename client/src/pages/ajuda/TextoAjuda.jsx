import React from 'react';

// Os textos dos artigos marcam com **asteriscos** o que aparece escrito na tela
// (botões, menus, campos), para o leitor reconhecer o rótulo exato.
export default function TextoAjuda({ texto }) {
  const partes = String(texto).split(/\*\*(.+?)\*\*/g);
  return partes.map((parte, i) => (
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900">{parte}</strong>
      : <React.Fragment key={i}>{parte}</React.Fragment>
  ));
}
