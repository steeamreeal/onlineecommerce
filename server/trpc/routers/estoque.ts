import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { router, storeProcedure } from "../trpc";
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";
import { buscarEmailAdministradorLoja, notificarEstoqueBaixo } from "@/lib/email/notificacoes";
import { executarComAprovacao } from "../aprovacao";

export const estoqueMovimentoSchema = z.object({
  variacaoId: z.string(),
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  quantidade: z.number().int().positive(),
  motivo: z.string().optional(),
});

export const estoqueImportarSchema = z.object({
  linhas: z
    .array(
      z.object({
        produto: z.string().min(1),
        cor: z.string().optional(),
        tamanho: z.string().optional(),
        modelo: z.string().optional(),
        quantidade: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(2000),
});

export async function executarRegistrarMovimento(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: { variacaoId: string; tipo: "ENTRADA" | "SAIDA"; quantidade: number; motivo?: string },
) {
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
}

// Importação em massa (CSV/Excel exportado como CSV): cada linha casa por
// nome do produto + cor/tamanho/modelo (case-insensitive) e SUBSTITUI o
// saldo da variação pelo valor da planilha — diferente de
// registrarMovimento, que soma/subtrai. Cada troca de saldo também vira um
// MovimentoEstoque (ENTRADA ou SAIDA, pela diferença) para manter o
// histórico consistente. Linhas sem variação correspondente são
// ignoradas e reportadas em `naoEncontrados`, sem interromper o restante.
export async function executarImportarEstoque(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: {
    linhas: { produto: string; cor?: string; tamanho?: string; modelo?: string; quantidade: number }[];
  },
) {
  const variacoes = await ctx.prisma.variacaoProduto.findMany({
    where: { produto: { lojaId: ctx.lojaId } },
    include: { produto: { select: { nome: true } } },
  });

  const normalizar = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
  const chaveDe = (nome: string, cor?: string | null, tamanho?: string | null, modelo?: string | null) =>
    [normalizar(nome), normalizar(cor), normalizar(tamanho), normalizar(modelo)].join("|");

  const porChave = new Map(
    variacoes.map((v) => [chaveDe(v.produto.nome, v.cor, v.tamanho, v.modelo), v]),
  );

  const naoEncontrados: string[] = [];
  const atualizacoes: { variacaoId: string; novoSaldo: number; saldoAnterior: number }[] = [];

  for (const linha of input.linhas) {
    const variacao = porChave.get(chaveDe(linha.produto, linha.cor, linha.tamanho, linha.modelo));
    if (!variacao) {
      naoEncontrados.push(
        [linha.produto, linha.cor, linha.tamanho, linha.modelo].filter(Boolean).join(" / "),
      );
      continue;
    }
    atualizacoes.push({
      variacaoId: variacao.id,
      novoSaldo: linha.quantidade,
      saldoAnterior: variacao.estoque,
    });
  }

  let atualizados = 0;
  await ctx.prisma.$transaction(async (tx) => {
    for (const { variacaoId, novoSaldo, saldoAnterior } of atualizacoes) {
      if (novoSaldo === saldoAnterior) continue;
      await tx.variacaoProduto.update({
        where: { id: variacaoId },
        data: { estoque: novoSaldo },
      });
      await tx.movimentoEstoque.create({
        data: {
          variacaoId,
          quantidade: Math.abs(novoSaldo - saldoAnterior),
          tipo: novoSaldo > saldoAnterior ? "ENTRADA" : "SAIDA",
          motivo: "Importação de planilha",
        },
      });
      atualizados++;
    }
  });

  return { atualizados, naoEncontrados };
}

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
    .input(estoqueMovimentoSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(
        ctx,
        "ESTOQUE_MOVIMENTO",
        `Movimento de estoque: ${input.tipo} ${input.quantidade}`,
        input,
        () => executarRegistrarMovimento(ctx, input),
      ),
    ),

  importar: storeProcedure
    .input(estoqueImportarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(
        ctx,
        "ESTOQUE_IMPORTAR",
        `Importação de estoque: ${input.linhas.length} linha(s)`,
        input,
        () => executarImportarEstoque(ctx, input),
      ),
    ),
});
