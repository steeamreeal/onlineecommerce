/**
 * Parser de CSV mínimo (sem dependência externa) — cobre o caso comum de
 * planilhas exportadas do Excel/Google Sheets: separador vírgula, campos
 * entre aspas quando contêm vírgula/quebra de linha, aspas duplicadas como
 * escape ("").
 */
export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  const conteudo = texto.replace(/^﻿/, ""); // remove BOM do Excel

  for (let i = 0; i < conteudo.length; i++) {
    const char = conteudo[i];
    const proximo = conteudo[i + 1];

    if (dentroDeAspas) {
      if (char === '"' && proximo === '"') {
        campo += '"';
        i++;
      } else if (char === '"') {
        dentroDeAspas = false;
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeAspas = true;
    } else if (char === ",") {
      linha.push(campo);
      campo = "";
    } else if (char === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (char === "\r") {
      // ignora, o \n seguinte fecha a linha
    } else {
      campo += char;
    }
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}
