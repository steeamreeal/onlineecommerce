import { describe, expect, it } from "vitest";
import {
  selecionarProdutosColecao,
  calcularPrecoMinimoPorCategoria,
  type Produto,
} from "../theme-renderer";

function criarProduto(overrides: {
  id: string;
  categoria?: { id: string } | null;
  precoNormal?: string;
  precoPromo?: string | null;
  createdAt?: Date;
}): Produto {
  return {
    id: overrides.id,
    nome: `Produto ${overrides.id}`,
    precoNormal: (overrides.precoNormal ?? "100") as unknown as Produto["precoNormal"],
    precoPromo: (overrides.precoPromo ?? null) as unknown as Produto["precoPromo"],
    status: "ATIVO",
    categoria: (overrides.categoria ?? null) as Produto["categoria"],
    categoriaId: overrides.categoria?.id ?? null,
    fotos: [],
    variacoes: [],
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
  } as unknown as Produto;
}

describe("selecionarProdutosColecao", () => {
  const produtos = [
    criarProduto({ id: "p1", createdAt: new Date("2026-01-01"), categoria: { id: "cat-a" } }),
    criarProduto({ id: "p2", createdAt: new Date("2026-03-01"), categoria: { id: "cat-a" } }),
    criarProduto({ id: "p3", createdAt: new Date("2026-02-01"), categoria: { id: "cat-b" } }),
  ];

  it("modo MANUAL sem categoria retorna tudo na ordem original", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "MANUAL" });
    expect(resultado.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("modo MANUAL com categoria filtra por categoriaId", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "MANUAL", categoriaId: "cat-a" });
    expect(resultado.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("modo MANUAL com produtosSelecionados usa a ordem escolhida pelo lojista", () => {
    const resultado = selecionarProdutosColecao(produtos, {
      modo: "MANUAL",
      categoriaId: "cat-a",
      produtosSelecionados: ["p2", "p1"],
    });
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p1"]);
  });

  it("modo MANUAL ignora produtosSelecionados que não existem mais (removidos/inativados)", () => {
    const resultado = selecionarProdutosColecao(produtos, {
      modo: "MANUAL",
      categoriaId: "cat-a",
      produtosSelecionados: ["p2", "id-que-nao-existe", "p1"],
    });
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p1"]);
  });

  it("modo LANCAMENTOS ordena por createdAt decrescente", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "LANCAMENTOS" });
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("modo LANCAMENTOS respeita o filtro de categoria", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "LANCAMENTOS", categoriaId: "cat-a" });
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p1"]);
  });

  it("modo MAIS_VENDIDOS ordena pelo ranking e completa com o resto no final", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "MAIS_VENDIDOS" }, ["p3", "p1"]);
    expect(resultado.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("modo MAIS_VENDIDOS sem ranking (loja nova, sem vendas) não quebra — mantém ordem original", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "MAIS_VENDIDOS" }, undefined);
    expect(resultado.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("modo MAIS_VENDIDOS ignora ids do ranking que não pertencem a esta loja/lista", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "MAIS_VENDIDOS" }, ["id-de-outra-loja", "p2"]);
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
  });

  it("quantidade corta o resultado final, depois de aplicar o modo", () => {
    const resultado = selecionarProdutosColecao(produtos, { modo: "LANCAMENTOS", quantidade: 2 });
    expect(resultado.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  it("sem modo definido, cai no comportamento MANUAL (padrão)", () => {
    const resultado = selecionarProdutosColecao(produtos, {});
    expect(resultado.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("calcularPrecoMinimoPorCategoria", () => {
  it("calcula o menor preço normal por categoria", () => {
    const produtos = [
      criarProduto({ id: "p1", categoria: { id: "cat-a" }, precoNormal: "200" }),
      criarProduto({ id: "p2", categoria: { id: "cat-a" }, precoNormal: "150" }),
      criarProduto({ id: "p3", categoria: { id: "cat-b" }, precoNormal: "500" }),
    ];
    const resultado = calcularPrecoMinimoPorCategoria(produtos);
    expect(resultado.get("cat-a")).toBe(150);
    expect(resultado.get("cat-b")).toBe(500);
  });

  it("usa o preço promocional quando existir, em vez do normal", () => {
    const produtos = [
      criarProduto({ id: "p1", categoria: { id: "cat-a" }, precoNormal: "200", precoPromo: "80" }),
      criarProduto({ id: "p2", categoria: { id: "cat-a" }, precoNormal: "150" }),
    ];
    const resultado = calcularPrecoMinimoPorCategoria(produtos);
    expect(resultado.get("cat-a")).toBe(80);
  });

  it("produto sem categoria não entra no cálculo de nenhuma categoria", () => {
    const produtos = [criarProduto({ id: "p1", categoria: null, precoNormal: "10" })];
    const resultado = calcularPrecoMinimoPorCategoria(produtos);
    expect(resultado.size).toBe(0);
  });

  it("lista vazia retorna mapa vazio", () => {
    expect(calcularPrecoMinimoPorCategoria([]).size).toBe(0);
  });
});
