import { describe, expect, it } from "vitest";
import {
  whatsappPedidoConfirmado,
  whatsappRecuperacaoCarrinho,
  whatsappStatusAtualizado,
} from "@/lib/whatsapp";

describe("lib/whatsapp", () => {
  it("whatsappPedidoConfirmado monta link wa.me com DDI 55 e mensagem codificada", () => {
    const link = whatsappPedidoConfirmado({
      telefone: "(11) 99999-9999",
      clienteNome: "Ana",
      lojaNome: "Loja da Ana",
      pedidoId: "pedido-abcdef123456",
    });

    expect(link).toMatch(/^https:\/\/wa\.me\/5511999999999\?text=/);
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("#123456");
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("Ana");
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("Loja da Ana");
  });

  it("whatsappStatusAtualizado usa o label em português do status, não o enum cru", () => {
    const link = whatsappStatusAtualizado({
      telefone: "11988887777",
      clienteNome: "Bia",
      lojaNome: "Loja X",
      pedidoId: "pedido-000000ffffff",
      status: "PRONTO_RETIRADA",
    });

    const mensagem = decodeURIComponent(link.split("?text=")[1]);
    expect(mensagem).toContain("Pronto para retirada");
    expect(mensagem).not.toContain("PRONTO_RETIRADA");
  });

  it("whatsappRecuperacaoCarrinho gera link válido sem depender de pedido", () => {
    const link = whatsappRecuperacaoCarrinho({
      telefone: "11977776666",
      clienteNome: "Caio",
      lojaNome: "Loja Y",
    });

    expect(link).toMatch(/^https:\/\/wa\.me\/5511977776666\?text=/);
    expect(decodeURIComponent(link.split("?text=")[1])).toContain("carrinho");
  });

  it("não duplica o DDI quando o telefone já foi digitado com +55", () => {
    const link = whatsappPedidoConfirmado({
      telefone: "+55 (11) 9 8888-7777",
      clienteNome: "Duda",
      lojaNome: "Loja Z",
      pedidoId: "pedido-111111",
    });

    const numero = link.replace("https://wa.me/", "").split("?")[0];
    expect(numero).toBe("5511988887777");
  });

  it("adiciona o DDI quando o telefone foi salvo sem ele (formato padrão do banco)", () => {
    const link = whatsappPedidoConfirmado({
      telefone: "(11) 98888-7777",
      clienteNome: "Duda",
      lojaNome: "Loja Z",
      pedidoId: "pedido-111111",
    });

    const numero = link.replace("https://wa.me/", "").split("?")[0];
    expect(numero).toBe("5511988887777");
  });
});
