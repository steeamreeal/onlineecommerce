import { describe, expect, it } from "vitest";
import { extrairNumeroDoTexto } from "../animated-number-text";

describe("extrairNumeroDoTexto", () => {
  it("encontra número simples no meio do texto", () => {
    expect(extrairNumeroDoTexto("Garantia de 30 dias")).toEqual({
      antes: "Garantia de ",
      numeroOriginal: "30",
      depois: " dias",
      alvo: 30,
    });
  });

  it("remove separador de milhar com ponto", () => {
    expect(extrairNumeroDoTexto("Mais de 10.000 clientes satisfeitos")).toEqual({
      antes: "Mais de ",
      numeroOriginal: "10.000",
      depois: " clientes satisfeitos",
      alvo: 10000,
    });
  });

  it("remove separador de milhar com vírgula", () => {
    const resultado = extrairNumeroDoTexto("Mais de 10,000 clientes");
    expect(resultado.alvo).toBe(10000);
  });

  it("sem número no texto, alvo é null e o texto inteiro vira 'antes'", () => {
    expect(extrairNumeroDoTexto("Troca fácil e garantida")).toEqual({
      antes: "Troca fácil e garantida",
      numeroOriginal: "",
      depois: "",
      alvo: null,
    });
  });

  it("string vazia não quebra", () => {
    expect(extrairNumeroDoTexto("").alvo).toBeNull();
  });

  it("pega só o primeiro número quando há mais de um", () => {
    const resultado = extrairNumeroDoTexto("Entrega em 3 a 5 dias úteis");
    expect(resultado.alvo).toBe(3);
    expect(resultado.depois).toBe(" a 5 dias úteis");
  });

  it("número no início do texto", () => {
    expect(extrairNumeroDoTexto("24h de atendimento")).toEqual({
      antes: "",
      numeroOriginal: "24",
      depois: "h de atendimento",
      alvo: 24,
    });
  });
});
