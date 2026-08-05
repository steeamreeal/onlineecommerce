// Parser/gerador CSV mínimo para import/export de clientes — sem lib externa
// porque o formato é simples (poucas colunas, sem aninhamento). Suporta
// campos entre aspas com vírgula/quebra de linha, no padrão RFC 4180 básico.

export const COLUNAS_EXPORTACAO = [
  "nome",
  "telefone",
  "email",
  "documento",
  "cidade",
  "estado",
  "totalGasto",
  "ultimaCompra",
] as const;

export const COLUNAS_IMPORTACAO = [
  "nome",
  "telefone",
  "email",
  "documento",
  "cidade",
  "estado",
  "totalGastoAnterior",
  "ultimaCompraAnterior",
] as const;

export type LinhaClienteImportada = {
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  cidade?: string;
  estado?: string;
  totalGastoAnterior?: number;
  ultimaCompraAnterior?: string;
};

function escaparCampo(valor: string): string {
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n")) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function gerarCsv(linhas: Record<string, string>[], colunas: readonly string[]): string {
  const cabecalho = colunas.join(",");
  const corpo = linhas.map((linha) => colunas.map((c) => escaparCampo(linha[c] ?? "")).join(","));
  return [cabecalho, ...corpo].join("\r\n");
}

function parseLinhaCsv(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    if (dentroAspas) {
      if (char === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (char === '"') {
        dentroAspas = false;
      } else {
        atual += char;
      }
    } else if (char === '"') {
      dentroAspas = true;
    } else if (char === ",") {
      campos.push(atual);
      atual = "";
    } else {
      atual += char;
    }
  }
  campos.push(atual);
  return campos;
}

/**
 * Faz o parse de um CSV de clientes. Aceita cabeçalho em qualquer ordem
 * (usa os nomes das colunas), mas exige a coluna "nome". Colunas
 * desconhecidas são ignoradas.
 */
export function parseCsvClientes(conteudo: string): LinhaClienteImportada[] {
  const linhas = conteudo
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (linhas.length === 0) return [];

  const cabecalho = parseLinhaCsv(linhas[0]).map((c) => c.trim().toLowerCase());
  const indiceNome = cabecalho.indexOf("nome");
  if (indiceNome === -1) {
    throw new Error('O CSV precisa ter uma coluna "nome".');
  }

  const indices = {
    nome: indiceNome,
    telefone: cabecalho.indexOf("telefone"),
    email: cabecalho.indexOf("email"),
    documento: cabecalho.indexOf("documento"),
    cidade: cabecalho.indexOf("cidade"),
    estado: cabecalho.indexOf("estado"),
    totalGastoAnterior: cabecalho.indexOf("totalgastoanterior"),
    ultimaCompraAnterior: cabecalho.indexOf("ultimacompraanterior"),
  };

  return linhas.slice(1).map((linha) => {
    const campos = parseLinhaCsv(linha);
    const pegar = (i: number) => (i >= 0 ? campos[i]?.trim() : undefined) || undefined;

    const totalGastoTexto = pegar(indices.totalGastoAnterior);
    const totalGastoAnterior = totalGastoTexto
      ? Number(totalGastoTexto.replace(",", "."))
      : undefined;

    return {
      nome: campos[indiceNome]?.trim() ?? "",
      telefone: pegar(indices.telefone),
      email: pegar(indices.email),
      documento: pegar(indices.documento),
      cidade: pegar(indices.cidade),
      estado: pegar(indices.estado),
      totalGastoAnterior:
        totalGastoAnterior !== undefined && !Number.isNaN(totalGastoAnterior)
          ? totalGastoAnterior
          : undefined,
      ultimaCompraAnterior: pegar(indices.ultimaCompraAnterior),
    };
  });
}

export function baixarArquivo(nomeArquivo: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
