import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { resolverLojaPorSlug } from "./loja-publica";
import { baixarEstoqueItens, calcularValorItens, formaPagamentoSchema, itemPedidoInputSchema } from "./pedidos";

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
          email: z.string().email().optional(),
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

      return ctx.prisma.$transaction(async (tx) => {
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

        await baixarEstoqueItens(tx, input.itens);

        if (cupomId) {
          await tx.cupom.update({ where: { id: cupomId }, data: { usosAtuais: { increment: 1 } } });
        }

        return tx.pedido.create({
          data: {
            lojaId: loja.id,
            clienteId: cliente.id,
            status: "NOVO",
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
      });
    }),
});
