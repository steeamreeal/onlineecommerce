import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Inativar um produto some com ele da vitrine pública — só Administrador e
// Gerente, não Estoquista (que cadastra/edita) nem Vendedor/Separador.
const gestorProcedure = roleProcedure(["ADMINISTRADOR", "GERENTE"]);
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";
import { buscarEmailAdministradorLoja, notificarEstoqueBaixo } from "@/lib/email/notificacoes";

const statusProdutoSchema = z.enum(["ATIVO", "INATIVO", "DESTAQUE"]);

const fotoSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  ordem: z.number().int().min(0),
  tipo: z.enum(["IMAGEM", "VIDEO"]).default("IMAGEM"),
});

const variacaoSchema = z.object({
  id: z.string().optional(),
  cor: z.string().optional(),
  tamanho: z.string().optional(),
  modelo: z.string().optional(),
  estoque: z.number().int().min(0),
});

const produtoInputBase = {
  nome: z.string().min(1),
  descricao: z.string().optional(),
  codigo: z.string().optional(),
  precoNormal: z.number().positive(),
  precoPromo: z.number().positive().optional(),
  pesoGramas: z.number().int().positive().optional(),
  alturaCm: z.number().int().positive().optional(),
  larguraCm: z.number().int().positive().optional(),
  profundidadeCm: z.number().int().positive().optional(),
  status: statusProdutoSchema.default("ATIVO"),
  categoriaId: z.string().optional(),
  fotos: z.array(fotoSchema).default([]),
  variacoes: z.array(variacaoSchema).min(1),
};

const produtoInputRefinement = (
  data: { precoNormal: number; precoPromo?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.precoPromo != null && data.precoPromo >= data.precoNormal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O preço promocional deve ser menor que o preço normal.",
      path: ["precoPromo"],
    });
  }
};

async function validarCategoria(
  prisma: import("@prisma/client").PrismaClient,
  lojaId: string,
  categoriaId?: string,
) {
  if (!categoriaId) return;
  const categoria = await prisma.categoria.findFirst({
    where: { id: categoriaId, lojaId },
  });
  if (!categoria) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Categoria inválida." });
  }
}

export const produtosRouter = router({
  listar: storeProcedure
    .input(
      z
        .object({
          busca: z.string().optional(),
          categoriaId: z.string().optional(),
          status: statusProdutoSchema.optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.produto.findMany({
        where: {
          lojaId: ctx.lojaId,
          categoriaId: input?.categoriaId,
          status: input?.status,
          nome: input?.busca
            ? { contains: input.busca, mode: "insensitive" }
            : undefined,
        },
        include: { fotos: true, variacoes: true, categoria: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  buscarPorId: storeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const produto = await ctx.prisma.produto.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { fotos: { orderBy: { ordem: "asc" } }, variacoes: true, categoria: true },
      });
      if (!produto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
      }
      return produto;
    }),

  criar: storeProcedure
    .input(z.object(produtoInputBase).superRefine(produtoInputRefinement))
    .mutation(async ({ ctx, input }) => {
      await validarCategoria(ctx.prisma, ctx.lojaId, input.categoriaId);

      const loja = await ctx.prisma.loja.findUniqueOrThrow({
        where: { id: ctx.lojaId },
        select: { plano: { select: { limiteProdutos: true } } },
      });
      if (loja.plano?.limiteProdutos != null) {
        const totalProdutos = await ctx.prisma.produto.count({ where: { lojaId: ctx.lojaId } });
        if (totalProdutos >= loja.plano.limiteProdutos) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Seu plano permite até ${loja.plano.limiteProdutos} produtos. Fale com o suporte para aumentar o limite.`,
          });
        }
      }

      return ctx.prisma.produto.create({
        data: {
          lojaId: ctx.lojaId,
          nome: input.nome,
          descricao: input.descricao,
          codigo: input.codigo,
          precoNormal: input.precoNormal,
          precoPromo: input.precoPromo,
          pesoGramas: input.pesoGramas,
          alturaCm: input.alturaCm,
          larguraCm: input.larguraCm,
          profundidadeCm: input.profundidadeCm,
          status: input.status,
          categoriaId: input.categoriaId,
          fotos: { create: input.fotos.map(({ url, ordem, tipo }) => ({ url, ordem, tipo })) },
          variacoes: {
            create: input.variacoes.map(({ cor, tamanho, modelo, estoque }) => ({
              cor,
              tamanho,
              modelo,
              estoque,
            })),
          },
        },
        include: { fotos: true, variacoes: true },
      });
    }),

  atualizar: storeProcedure
    .input(
      z
        .object({
          id: z.string(),
          ...produtoInputBase,
        })
        .superRefine(produtoInputRefinement),
    )
    .mutation(async ({ ctx, input }) => {
      const produtoExistente = await ctx.prisma.produto.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { fotos: true, variacoes: true },
      });
      if (!produtoExistente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
      }
      const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

      await validarCategoria(ctx.prisma, ctx.lojaId, input.categoriaId);

      // IDs de fotos/variações existentes DESTE produto (já escopado por lojaId
      // via produtoExistente). Qualquer id enviado pelo client que não esteja
      // nesses conjuntos é tratado como "criar novo" em vez de "atualizar",
      // evitando que um id de outra loja/produto seja usado para sobrescrever
      // dados que não pertencem a este tenant (IDOR entre tenants).
      const idsFotosExistentes = new Set(produtoExistente.fotos.map((f) => f.id));
      const idsVariacoesExistentes = new Set(produtoExistente.variacoes.map((v) => v.id));

      const fotosParaManter = input.fotos.filter((f) => f.id && idsFotosExistentes.has(f.id));
      const idsFotosParaManter = new Set(fotosParaManter.map((f) => f.id));
      const fotosParaRemover = produtoExistente.fotos.filter(
        (f) => !idsFotosParaManter.has(f.id),
      );
      const fotosParaCriar = input.fotos.filter(
        (f) => !f.id || !idsFotosExistentes.has(f.id),
      );

      const variacoesParaManter = input.variacoes.filter(
        (v) => v.id && idsVariacoesExistentes.has(v.id),
      );
      const idsVariacoesParaManter = new Set(variacoesParaManter.map((v) => v.id));
      const variacoesParaRemover = produtoExistente.variacoes.filter(
        (v) => !idsVariacoesParaManter.has(v.id),
      );
      const variacoesParaCriar = input.variacoes.filter(
        (v) => !v.id || !idsVariacoesExistentes.has(v.id),
      );

      return ctx.prisma.$transaction(async (tx) => {
        await tx.produto.update({
          where: { id: input.id },
          data: {
            nome: input.nome,
            descricao: input.descricao,
            codigo: input.codigo,
            precoNormal: input.precoNormal,
            precoPromo: input.precoPromo,
            pesoGramas: input.pesoGramas,
            alturaCm: input.alturaCm,
            larguraCm: input.larguraCm,
            profundidadeCm: input.profundidadeCm,
            status: input.status,
            categoriaId: input.categoriaId,
          },
        });

        if (fotosParaRemover.length > 0) {
          await tx.fotoProduto.deleteMany({
            where: { id: { in: fotosParaRemover.map((f) => f.id) }, produtoId: input.id },
          });
        }
        for (const foto of fotosParaManter) {
          await tx.fotoProduto.updateMany({
            where: { id: foto.id, produtoId: input.id },
            data: { url: foto.url, ordem: foto.ordem, tipo: foto.tipo },
          });
        }
        if (fotosParaCriar.length > 0) {
          await tx.fotoProduto.createMany({
            data: fotosParaCriar.map(({ url, ordem, tipo }) => ({
              produtoId: input.id,
              url,
              ordem,
              tipo,
            })),
          });
        }

        if (variacoesParaRemover.length > 0) {
          await tx.variacaoProduto.deleteMany({
            where: { id: { in: variacoesParaRemover.map((v) => v.id) }, produtoId: input.id },
          });
        }
        const estoqueAnteriorPorId = new Map(produtoExistente.variacoes.map((v) => [v.id, v.estoque]));

        for (const variacao of variacoesParaManter) {
          await tx.variacaoProduto.updateMany({
            where: { id: variacao.id, produtoId: input.id },
            data: {
              cor: variacao.cor,
              tamanho: variacao.tamanho,
              modelo: variacao.modelo,
              estoque: variacao.estoque,
            },
          });

          // Mesma regra de cruzamento de limite da baixa por venda/movimento
          // manual (pedidos.ts, estoque.ts): só notifica quando o lojista
          // edita o estoque para um valor que cruza de acima do limite para
          // em/abaixo dele, não a cada edição enquanto já está baixo.
          const estoqueAntes = estoqueAnteriorPorId.get(variacao.id!);
          if (
            estoqueAntes != null &&
            estoqueAntes > ESTOQUE_BAIXO_LIMITE &&
            variacao.estoque <= ESTOQUE_BAIXO_LIMITE
          ) {
            const emailAdmin = await buscarEmailAdministradorLoja(tx, ctx.lojaId);
            await notificarEstoqueBaixo(tx, {
              lojaId: ctx.lojaId,
              lojaNome: loja.nome,
              lojistaEmail: emailAdmin,
              produtoNome: input.nome,
              variacaoLabel: variacaoLabel({
                cor: variacao.cor ?? null,
                tamanho: variacao.tamanho ?? null,
                modelo: variacao.modelo ?? null,
              }),
              estoqueAtual: variacao.estoque,
            });
          }
        }
        if (variacoesParaCriar.length > 0) {
          await tx.variacaoProduto.createMany({
            data: variacoesParaCriar.map(({ cor, tamanho, modelo, estoque }) => ({
              produtoId: input.id,
              cor,
              tamanho,
              modelo,
              estoque,
            })),
          });
        }

        return tx.produto.findUniqueOrThrow({
          where: { id: input.id },
          include: { fotos: true, variacoes: true },
        });
      });
    }),

  remover: gestorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const produto = await ctx.prisma.produto.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!produto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
      }
      // Sem soft-delete no schema: inativa em vez de apagar, preservando o
      // histórico de pedidos que referenciam este produto.
      return ctx.prisma.produto.update({
        where: { id: input.id },
        data: { status: "INATIVO" },
      });
    }),
});
