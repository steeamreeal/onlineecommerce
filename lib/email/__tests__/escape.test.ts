import { describe, expect, it } from "vitest";
import { escaparHtml } from "../layout";
import { templatePedidoConfirmado, templateEstoqueBaixo } from "../templates";

describe("escape de HTML nos e-mails", () => {
  it("escapa caracteres especiais", () => {
    expect(escaparHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("não deixa o nome do cliente injetar marcação no e-mail de pedido", () => {
    const { html } = templatePedidoConfirmado({
      lojaNome: "Loja",
      clienteNome: `<a href="https://golpe.example">Clique aqui</a>`,
      pedidoId: "abcdef123456",
      valorTotal: 10,
    });
    expect(html).not.toContain("<a href=\"https://golpe.example\">");
    expect(html).toContain("&lt;a href=&quot;https://golpe.example&quot;&gt;");
  });

  it("escapa nome de produto/loja no aviso de estoque", () => {
    const { html } = templateEstoqueBaixo({
      lojaNome: "<b>Loja</b>",
      produtoNome: "<script>x</script>",
      variacaoLabel: "P",
      estoqueAtual: 1,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Loja</b>");
  });
});
