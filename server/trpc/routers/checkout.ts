import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { resolverLojaPorSlug } from "./loja-publica";
import { baixarEstoqueItens, calcularValorItens, formaPagamentoSchema, itemPedidoInputSchema } from "./pedidos";
import { getMpPreference } from "@/lib/mercadopago";
import { notificarPedidoConfirmado } from "@/lib/email/notificacoes";
import { baseUrl } from "@/lib/base-url";

// Formas de pagamento que passam pelo gateway Mercado Pago. PAGAMENTO_ENTREGA
// não gera preferência — confirmação é manual pelo lojista no painel.
const FORMAS_COM_GATEWAY = ["PIX", "CARTAO", "BOLETO", "LINK_PAGAMENTO"] as const;

const enderecoInputSchema = z.object({
  rua: z.string().min(1),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().min(1),
  estado: z.string().min(1),
  cep: z.string().min(1),
});

export const checkoutRouter = router({
  // Cria o pedido do site público: resolve a loja pelo slug (nunca confia em
  // lojaId vindo do client), cria ou reaproveita o Cliente pelo
  // telefone/e-mail dentro do escopo da loja, e cai na mesma lógica
  // transacional de baixa de estoque/cupom do painel (pedidos.ts).
  criarPedido: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        cliente: z.object({
          nome: z.string().min(1),
          telefone: z.string().min(8),
          email: z.string().email(),
        }),
        modoEntrega: z.enum(["RETIRADA", "ENTREGA"]),
        endereco: enderecoInputSchema.optional(),
        freteId: z.string().optional(),
        formaPagamento: formaPagamentoSchema,
        itens: z.array(itemPedidoInputSchema).min(1),
        cupomCodigo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.modoEntrega === "ENTREGA" && !input.endereco) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Endereço é obrigatório para entrega.",
        });
      }

      const loja = await resolverLojaPorSlug(ctx.prisma, input.slug);

      let valorFrete = 0;
      if (input.modoEntrega === "ENTREGA") {
        if (!input.freteId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma forma de envio." });
        }
        const frete = await ctx.prisma.opcaoFrete.findFirst({
          where: { id: input.freteId, lojaId: loja.id, ativo: true },
        });
        if (!frete) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Forma de envio inválida." });
        }
        valorFrete = Number(frete.valor ?? 0);
      }

      const itensComPreco = await calcularValorItens(ctx.prisma, loja.id, input.itens);
      const valorProdutos = itensComPreco.reduce((s, i) => s + i.precoUnit * i.quantidade, 0);

      if (input.modoEntrega === "ENTREGA" && input.freteId) {
        const frete = await ctx.prisma.opcaoFrete.findFirst({
          where: { id: input.freteId, lojaId: loja.id },
        });
        if (frete?.freteGratisAcimaDe != null && valorProdutos >= Number(frete.freteGratisAcimaDe)) {
          valorFrete = 0;
        }
      }

      let cupomId: string | undefined;
      let valorDesconto = 0;

      if (input.cupomCodigo) {
        const cupom = await ctx.prisma.cupom.findFirst({
          where: { lojaId: loja.id, codigo: input.cupomCodigo.toUpperCase() },
        });
        const agora = new Date();
        if (
          !cupom ||
          agora < cupom.inicio ||
          agora > cupom.fim ||
          (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso)
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cupom inválido ou expirado." });
        }
        cupomId = cupom.id;
        if (cupom.tipo === "PERCENTUAL") {
          valorDesconto = (valorProdutos * Number(cupom.valor ?? 0)) / 100;
        } else if (cupom.tipo === "VALOR_FIXO") {
          valorDesconto = Math.min(Number(cupom.valor ?? 0), valorProdutos);
        } else if (cupom.tipo === "FRETE_GRATIS") {
          valorDesconto = valorFrete;
          valorFrete = 0;
        }
      }

      const valorTotal = Math.max(0, valorProdutos + valorFrete - valorDesconto);
      const usaGateway = (FORMAS_COM_GATEWAY as readonly string[]).includes(input.formaPagamento);

      // Validado antes de criar o pedido: sem isso, baixaríamos estoque e
      // criaríamos o pedido para só então descobrir que a loja não tem como
      // receber o pagamento.
      if (usaGateway && !loja.mpAccessToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta loja ainda não configurou o pagamento online. Escolha pagamento na entrega ou contate o lojista.",
        });
      }

      const pedido = await ctx.prisma.$transaction(async (tx) => {
        // Reaproveita cliente existente da loja pelo telefone; senão cria um novo.
        let cliente = await tx.cliente.findFirst({
          where: { lojaId: loja.id, telefone: input.cliente.telefone },
        });

        if (!cliente) {
          cliente = await tx.cliente.create({
            data: {
              lojaId: loja.id,
              nome: input.cliente.nome,
              telefone: input.cliente.telefone,
              email: input.cliente.email,
            },
          });
        } else if (cliente.email !== input.cliente.email) {
          // Cadastro antigo (ex.: de antes do e-mail virar obrigatório) pode
          // não ter e-mail salvo — sem atualizar aqui, as notificações de
          // status do pedido nunca teriam para onde ir.
          cliente = await tx.cliente.update({
            where: { id: cliente.id },
            data: { email: input.cliente.email },
          });
        }

        if (input.modoEntrega === "ENTREGA" && input.endereco) {
          await tx.enderecoCliente.create({
            data: {
              clienteId: cliente.id,
              ...input.endereco,
              principal: true,
            },
          });
        }

        await baixarEstoqueItens(tx, input.itens, loja);

        if (cupomId) {
          await tx.cupom.update({ where: { id: cupomId }, data: { usosAtuais: { increment: 1 } } });
        }

        const novoPedido = await tx.pedido.create({
          data: {
            lojaId: loja.id,
            clienteId: cliente.id,
            status: usaGateway ? "AGUARDANDO_PAGAMENTO" : "NOVO",
            formaPagamento: input.formaPagamento,
            valorFrete,
            valorDesconto,
            valorTotal,
            cupomId,
            itens: {
              create: itensComPreco.map((item) => ({
                produtoId: item.produtoId,
                variacaoId: item.variacaoId,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit,
              })),
            },
          },
          include: { itens: true, cliente: true, cupom: true },
        });

        await notificarPedidoConfirmado(tx, {
          lojaId: loja.id,
          lojaNome: loja.nome,
          clienteNome: cliente.nome,
          clienteEmail: cliente.email,
          pedidoId: novoPedido.id,
          valorTotal,
        });

        return novoPedido;
      });

      if (!usaGateway) {
        return { pedido, linkPagamento: null };
      }

      // Preferência de pagamento fora da transação: se a chamada ao Mercado
      // Pago falhar, o pedido já existe como AGUARDANDO_PAGAMENTO e pode ser
      // retomado, em vez de perder a baixa de estoque já confirmada.
      // mpAccessToken é da própria loja (Mercado Pago Connect) — o dinheiro
      // cai direto na conta do lojista, nunca numa conta da plataforma.
      // A preferência precisa somar exatamente o valorTotal do pedido (produtos
      // + frete - desconto). O Mercado Pago não aceita item com preço negativo,
      // então o desconto do cupom é rateado proporcionalmente entre os itens de
      // produto, e o frete entra como item de linha à parte.
      const fatorDesconto = valorProdutos > 0 ? 1 - valorDesconto / valorProdutos : 1;
      const itemsComDesconto = pedido.itens.map((item) => ({
        id: item.produtoId,
        title: `Item do pedido ${pedido.id}`,
        quantity: item.quantidade,
        unit_price: Number((Number(item.precoUnit) * fatorDesconto).toFixed(2)),
      }));

      const itemsPreferencia =
        valorFrete > 0
          ? [...itemsComDesconto, { id: "frete", title: "Frete", quantity: 1, unit_price: valorFrete }]
          : itemsComDesconto;

      // Sem essa restrição, o Checkout Pro do Mercado Pago abre com todas as
      // abas (cartão, PIX, boleto) e cai por padrão na de cartão — ignorando
      // a forma de pagamento que o cliente já escolheu no site.
      const excludedPaymentTypesPorForma: Record<string, { id: string }[]> = {
        PIX: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }],
        CARTAO: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }],
        BOLETO: [{ id: "credit_card" }, { id: "debit_card" }, { id: "bank_transfer" }, { id: "atm" }],
      };

      const preferencia = await getMpPreference(loja.mpAccessToken!).create({
        body: {
          items: itemsPreferencia,
          external_reference: pedido.id,
          payer: { name: pedido.cliente.nome, email: pedido.cliente.email ?? undefined },
          payment_methods: {
            excluded_payment_types: excludedPaymentTypesPorForma[input.formaPagamento] ?? [],
          },
          back_urls: {
            success: `${baseUrl()}/loja/${loja.slug}/pedido/${pedido.id}`,
            pending: `${baseUrl()}/loja/${loja.slug}/pedido/${pedido.id}`,
            failure: `${baseUrl()}/loja/${loja.slug}/pedido/${pedido.id}`,
          },
        },
      });

      const linkPagamento = preferencia.init_point ?? null;
      if (linkPagamento) {
        await ctx.prisma.pedido.update({ where: { id: pedido.id }, data: { linkPagamento } });
      }

      return { pedido, linkPagamento };
    }),
});
