import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Criar/remover categorias afeta a organização de produtos em toda a loja —
// restrito a quem administra ou gerencia, não a Vendedor/Estoquista/Separador.
const gestorProcedure = roleProcedure(["ADMINISTRADOR", "GERENTE"]);

export const categoriasRouter = router({
  listar: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.categoria.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { nome: "asc" },
    });
  }),

  criar: gestorProcedure
    .input(z.object({ nome: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existente = await ctx.prisma.categoria.findUnique({
        where: { lojaId_nome: { lojaId: ctx.lojaId, nome: input.nome } },
      });
      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Esta categoria já existe." });
      }
      return ctx.prisma.categoria.create({
        data: { lojaId: ctx.lojaId, nome: input.nome },
      });
    }),

  // Cria várias categorias de uma vez (ex.: lista de sugestões), pulando
  // silenciosamente as que já existem — evita o lojista ter que checar
  // uma a uma antes de clicar em "adicionar sugeridas".
  criarVarias: gestorProcedure
    .input(z.object({ nomes: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existentes = await ctx.prisma.categoria.findMany({
        where: { lojaId: ctx.lojaId, nome: { in: input.nomes } },
        select: { nome: true },
      });
      const nomesExistentes = new Set(existentes.map((c) => c.nome));
      const novos = input.nomes.filter((nome) => !nomesExistentes.has(nome));

      if (novos.length === 0) {
        return { criadas: 0 };
      }

      await ctx.prisma.categoria.createMany({
        data: novos.map((nome) => ({ lojaId: ctx.lojaId, nome })),
      });
      return { criadas: novos.length };
    }),

  remover: gestorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const categoria = await ctx.prisma.categoria.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { _count: { select: { produtos: true } } },
      });
      if (!categoria) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Categoria não encontrada." });
      }
      if (categoria._count.produtos > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Esta categoria está em uso por produtos. Remova ou mude a categoria desses produtos antes de excluí-la.",
        });
      }
      await ctx.prisma.categoria.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
