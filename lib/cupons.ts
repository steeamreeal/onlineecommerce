import type { Cupom, TipoCupom } from "@prisma/client";

export const TIPO_CUPOM_LABEL: Record<TipoCupom, string> = {
  PERCENTUAL: "Percentual",
  VALOR_FIXO: "Valor fixo",
  FRETE_GRATIS: "Frete grátis",
};

export type StatusCupom = "ATIVO" | "EXPIRADO" | "ESGOTADO" | "AGENDADO";

export function cupomStatus(cupom: Pick<Cupom, "inicio" | "fim" | "limiteUso" | "usosAtuais">): StatusCupom {
  const agora = new Date();
  if (agora < cupom.inicio) return "AGENDADO";
  if (agora > cupom.fim) return "EXPIRADO";
  if (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso) return "ESGOTADO";
  return "ATIVO";
}

type CupomComEscopo = Pick<Cupom, "tipo" | "valor"> & {
  produtos: { id: string }[];
  categorias: { id: string }[];
};

export type ItemParaCupom = { produtoId: string; categoriaId: string | null; precoUnit: number; quantidade: number };

// Cupom sem produtos/categorias vale para a loja inteira; com restrição só
// vale para os itens listados. Mesma regra usada na validação do site e no
// cálculo do pedido (o servidor nunca confia no client para isso).
export function itemElegivelParaCupom(
  cupom: Pick<CupomComEscopo, "produtos" | "categorias">,
  item: Pick<ItemParaCupom, "produtoId" | "categoriaId">,
) {
  const restrito = cupom.produtos.length > 0 || cupom.categorias.length > 0;
  if (!restrito) return true;
  return (
    cupom.produtos.some((p) => p.id === item.produtoId) ||
    (item.categoriaId != null && cupom.categorias.some((c) => c.id === item.categoriaId))
  );
}

// Retorna o desconto e o frete resultantes, ou `null` quando o cupom
// restrito não se aplica a nenhum item do carrinho.
export function calcularDescontoCupom(
  cupom: CupomComEscopo,
  itens: ItemParaCupom[],
  valorFrete: number,
): { valorDesconto: number; valorFrete: number } | null {
  const elegiveis = itens.filter((item) => itemElegivelParaCupom(cupom, item));
  if (elegiveis.length === 0) return null;

  const base = elegiveis.reduce((soma, item) => soma + item.precoUnit * item.quantidade, 0);

  if (cupom.tipo === "PERCENTUAL") {
    return { valorDesconto: (base * Number(cupom.valor ?? 0)) / 100, valorFrete };
  }
  if (cupom.tipo === "VALOR_FIXO") {
    return { valorDesconto: Math.min(Number(cupom.valor ?? 0), base), valorFrete };
  }
  return { valorDesconto: valorFrete, valorFrete: 0 };
}
