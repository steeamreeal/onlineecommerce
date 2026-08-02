import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure } from "../trpc";
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";
import { buscarEmailAdministradorLoja, notificarEstoqueBaixo } from "@/lib/email/notificacoes";

export const estoqueRouter = router({
  listarVariacoes: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.variacaoProduto.findMany({
      where: { produto: { lojaId: ctx.lojaId } },
      include: { produto: { select: { nome: true } } },
      orderBy: [{ produto: { nome: "asc" } }],
    });
  }),

  listarMovimentos: storeProcedure
    .input(z.object({ variacaoId: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.movimentoEstoque.findMany({
        where: {
          variacaoId: input?.variacaoId,
          variacao: { produto: { lojaId: ctx.lojaId } },
        },
        include: {
          variacao: { include: { produto: { select: { nome: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  registrarMovimento: storeProcedure
    .input(
      z.object({
        variacaoId: z.string(),
        tipo: z.enum(["ENTRADA", "SAIDA"]),
        quantidade: z.number().int().positive(),
        motivo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const variacao = await ctx.prisma.variacaoProduto.findFirst({
        where: { id: input.variacaoId, produto: { lojaId: ctx.lojaId } },
      });
      if (!variacao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Variação não encontrada." });
      }

      const delta = input.tipo === "ENTRADA" ? input.quantidade : -input.quantidade;

      return ctx.prisma.$transaction(async (tx) => {
        // A checagem de saldo suficiente e o incremento precisam ser atômicos:
        // fazemos ambos em uma única updateMany condicionada, para que o
        // próprio banco garanta que não há TOCTOU entre "ler estoque" e
        // "decrementar estoque" quando duas saídas concorrentes chegam ao
        // mesmo tempo. Se count === 0, ninguém foi atualizado (saldo
        // insuficiente no momento exato da escrita, ou variação sumiu).
        const resultado = await tx.variacaoProduto.updateMany({
          where:
            input.tipo === "SAIDA"
              ? { id: input.variacaoId, produtoId: variacao.produtoId, estoque: { gte: input.quantidade } }
              : { id: input.variacaoId, produtoId: variacao.produtoId },
          data: { estoque: { increment: delta } },
        });

        if (resultado.count === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Quantidade de saída maior que o estoque disponível.",
          });
        }

        const variacaoAtualizada = await tx.variacaoProduto.findUniqueOrThrow({
          where: { id: input.variacaoId },
        });

        const movimento = await tx.movimentoEstoque.create({
          data: {
            variacaoId: input.variacaoId,
            quantidade: input.quantidade,
            tipo: input.tipo,
            motivo: input.motivo,
          },
        });

        // Mesma regra de cruzamento de limite usada na baixa automática por
        // venda (pedidos.ts): só notifica quando o estoque passa de acima do
        // limite para em/abaixo dele.
        if (
          input.tipo === "SAIDA" &&
          variacao.estoque > ESTOQUE_BAIXO_LIMITE &&
          variacaoAtualizada.estoque <= ESTOQUE_BAIXO_LIMITE
        ) {
          const [loja, produto] = await Promise.all([
            tx.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } }),
            tx.produto.findUniqueOrThrow({ where: { id: variacao.produtoId } }),
          ]);
          const emailAdmin = await buscarEmailAdministradorLoja(tx, ctx.lojaId);
          await notificarEstoqueBaixo(tx, {
            lojaId: ctx.lojaId,
            lojaNome: loja.nome,
            lojistaEmail: emailAdmin,
            produtoNome: produto.nome,
            variacaoLabel: variacaoLabel(variacaoAtualizada),
            estoqueAtual: variacaoAtualizada.estoque,
          });
        }

        return { movimento, variacao: variacaoAtualizada };
      });
    }),
});
