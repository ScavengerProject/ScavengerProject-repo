import React from 'react';
import { Link } from 'react-router-dom';
import { FOCO } from './movimento';

// Rodapé das páginas públicas (landing e central de ajuda).
export default function RodapeSite({ children }) {
  return (
    <footer className="border-t border-gray-200 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-gray-900">Arena</span> · Projeto desenvolvido na Unipampa
          </p>
          {children}
        </div>
        <ul className="flex flex-wrap gap-6">
          <li><Link to="/ajuda" className={`hover:text-gray-900 ${FOCO}`}>Central de ajuda</Link></li>
          <li><Link to="/login" className={`hover:text-gray-900 ${FOCO}`}>Entrar</Link></li>
          <li><Link to="/inscricao" className={`hover:text-gray-900 ${FOCO}`}>Criar conta</Link></li>
        </ul>
      </div>
    </footer>
  );
}
