import React from "react";
import { clsx } from "clsx"; 
import { twMerge } from "tailwind-merge";

export function cn(...inputs) { 
  return twMerge(clsx(inputs));
}

// E-mail com um ponto de quebra preferencial antes do "@" (<wbr>), para ser
// usado com `break-words`: em tela estreita ele quebra em "fulano" / "@dominio"
// em vez de cortar no meio do domínio. <wbr> não vai junto quando o texto é
// copiado, ao contrário de um espaço invisível.
export function emailQuebravel(email) {
  const arroba = typeof email === 'string' ? email.indexOf('@') : -1;
  if (arroba <= 0) return email;
  return <>{email.slice(0, arroba)}<wbr />{email.slice(arroba)}</>;
}
