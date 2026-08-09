import { describe, expect, it } from "vitest";
import { ehProdutoNovo } from "../product-card";

describe("ehProdutoNovo", () => {
  it("produto criado hoje é novo", () => {
    expect(ehProdutoNovo(new Date())).toBe(true);
  });

  it("produto criado há 29 dias ainda é novo", () => {
    const data = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    expect(ehProdutoNovo(data)).toBe(true);
  });

  it("produto criado há 31 dias não é mais novo", () => {
    const data = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(ehProdutoNovo(data)).toBe(false);
  });

  it("aceita string ISO (como vem depois da desserialização do superjson)", () => {
    const dataIso = new Date().toISOString();
    expect(ehProdutoNovo(dataIso)).toBe(true);
  });

  it("data futura (relógio do servidor adiantado) não quebra e conta como novo", () => {
    const data = new Date(Date.now() + 1000 * 60 * 60);
    expect(ehProdutoNovo(data)).toBe(true);
  });
});
