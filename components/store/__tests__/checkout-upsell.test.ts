import { describe, expect, it } from "vitest";
import { selecionarSugestoesUpsell } from "../checkout-upsell";
import type { Produto } from "../theme-renderer";

function criarProduto(overrides: {
  id: string;
  categoria?: { id: string } | null;
  estoque?: number;
  semVariacoes?: boolean;
}): Produto {
  return {
    id: overrides.id,
    nome: `Produto ${overrides.id}`,
    precoNormal: "100",
    precoPromo: null,
    status: "ATIVO",
    categoria: overrides.categoria ?? null,
    categoriaId: overrides.categoria?.id ?? null,
    fotos: [],
    variacoes: overrides.semVariacoes
      ? []
      : [{ id: `${overrides.id}-v1`, estoque: overrides.estoque ?? 5 } as never],
    createdAt: new Date("2026-01-01"),
  } as unknown as Produto;
}

describe("selecionarSugestoesUpsell", () => {
  const p1 = criarProduto({ id: "p1", categoria: { id: "cat-a" } });
  const p2 = criarProduto({ id: "p2", categoria: { id: "cat-a" } });
  const p3 = criarProduto({ id: "p3", categoria: { id: "cat-b" } });
  const p4 = criarProduto({ id: "p4", categoria: { id: "cat-b" } });
  const p5Esgotado = criarProduto({ id: "p5", categoria: { id: "cat-a" }, estoque: 0 });
  const produtos = [p1, p2, p3, p4, p5Esgotado];

  it("prioriza mais vendidos quando existe ranking", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(), new Set(), ["p3", "p1"]);
    expect(resultado.map((p) => p.id)).toEqual(["p3", "p1"]);
  });

  it("nunca sugere produto já no carrinho", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(["p3"]), new Set(), ["p3", "p1"]);
    expect(resultado.map((p) => p.id)).toEqual(["p1"]);
  });

  it("nunca sugere produto esgotado", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(), new Set(), ["p5"]);
    expect(resultado.map((p) => p.id)).not.toContain("p5");
  });

  it("loja nova sem ranking: cai pra produtos da mesma categoria do carrinho", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(["p1"]), new Set(["cat-a"]), undefined);
    expect(resultado.map((p) => p.id)).toEqual(["p2"]);
  });

  it("sem ranking e sem categoria em comum: mostra qualquer produto disponível", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(), new Set(), undefined);
    expect(resultado.length).toBeGreaterThan(0);
    expect(resultado.map((p) => p.id)).not.toContain("p5");
  });

  it("respeita o limite pedido", () => {
    const resultado = selecionarSugestoesUpsell(produtos, new Set(), new Set(), undefined, 2);
    expect(resultado).toHaveLength(2);
  });

  it("nada disponível: retorna lista vazia", () => {
    const resultado = selecionarSugestoesUpsell([p5Esgotado], new Set(), new Set(), undefined);
    expect(resultado).toEqual([]);
  });
});
