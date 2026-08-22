import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Criar/remover categorias afeta a organização de produtos em toda a loja —
// restrito a quem administra ou gerencia, não a Vendedor/Estoquista/Separador.
const gestorProcedure = roleProcedure(["ADMINISTRADOR", "DONO", "GERENTE"]);

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

  // Lista os produtos vinculados a uma categoria, para o lojista decidir
  // para onde cada um vai antes de excluí-la (ver `remover`).
  produtosDaCategoria: gestorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const categoria = await ctx.prisma.categoria.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!categoria) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Categoria não encontrada." });
      }
      return ctx.prisma.produto.findMany({
        where: { categoriaId: input.id, lojaId: ctx.lojaId },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      });
    }),

  remover: gestorProcedure
    .input(
      z.object({
        id: z.string(),
        // Para cada produto atualmente na categoria, para qual categoria ele deve
        // ir (ou null para ficar sem categoria). Obrigatório cobrir todos os
        // produtos da categoria quando ela tiver produtos vinculados.
        produtoDestinos: z.record(z.string(), z.string().nullable()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const categoria = await ctx.prisma.categoria.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { produtos: { select: { id: true } } },
      });
      if (!categoria) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Categoria não encontrada." });
      }

      if (categoria.produtos.length > 0) {
        const destinos = input.produtoDestinos ?? {};
        const idsFaltando = categoria.produtos.filter((p) => !(p.id in destinos));
        if (idsFaltando.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Esta categoria está em uso por produtos. Escolha para qual categoria cada produto vai antes de excluí-la.",
          });
        }

        const categoriasDestinoIds = Array.from(
          new Set(Object.values(destinos).filter((v): v is string => v !== null)),
        );
        if (categoriasDestinoIds.length > 0) {
          const categoriasValidas = await ctx.prisma.categoria.count({
            where: { id: { in: categoriasDestinoIds }, lojaId: ctx.lojaId },
          });
          if (categoriasValidas !== categoriasDestinoIds.length) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria de destino inválida." });
          }
        }

        await ctx.prisma.$transaction([
          ...categoria.produtos.map((produto) =>
            ctx.prisma.produto.update({
              where: { id: produto.id },
              data: { categoriaId: destinos[produto.id] },
            }),
          ),
          ctx.prisma.categoria.delete({ where: { id: input.id } }),
        ]);
        return { ok: true };
      }

      await ctx.prisma.categoria.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
