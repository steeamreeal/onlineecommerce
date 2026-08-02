import { describe, expect, it } from "vitest";
import {
  templateEstoqueBaixo,
  templatePedidoConfirmado,
  templateStatusAtualizado,
} from "@/lib/email/templates";

describe("lib/email/templates", () => {
  it("templatePedidoConfirmado inclui os 6 últimos dígitos do id em maiúsculo e o valor formatado em BRL", () => {
    const { assunto, html } = templatePedidoConfirmado({
      lojaNome: "Loja da Ana",
      clienteNome: "Bia",
      pedidoId: "clx0000000abcdef",
      valorTotal: 1234.5,
    });

    expect(assunto).toContain("#ABCDEF");
    expect(assunto).toContain("Loja da Ana");
    expect(html).toContain("Bia");
    expect(html).toContain("R$");
    expect(html).toContain("1.234,50");
  });

  it("templateStatusAtualizado usa o label em português, nunca o enum cru", () => {
    const { assunto, html } = templateStatusAtualizado({
      lojaNome: "Loja X",
      clienteNome: "Caio",
      pedidoId: "pedido-000000ffffff",
      status: "EM_PREPARACAO",
    });

    expect(assunto).toContain("Em preparação");
    expect(html).toContain("Em preparação");
    expect(assunto).not.toContain("EM_PREPARACAO");
    expect(html).not.toContain("EM_PREPARACAO");
  });

  it("templateEstoqueBaixo expõe produto, variação e quantidade atual", () => {
    const { assunto, html } = templateEstoqueBaixo({
      lojaNome: "Loja Y",
      produtoNome: "Camiseta Azul",
      variacaoLabel: "M",
      estoqueAtual: 3,
    });

    expect(assunto).toContain("Camiseta Azul");
    expect(html).toContain("Camiseta Azul");
    expect(html).toContain("M");
    expect(html).toContain("3");
  });
});
