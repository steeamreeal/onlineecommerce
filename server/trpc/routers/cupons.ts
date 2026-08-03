import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Criar/editar/remover cupons afeta descontos em toda a loja — restrito a
// quem administra ou gerencia, não a Vendedor/Estoquista/Separador.
const gestorProcedure = roleProcedure(["ADMINISTRADOR", "GERENTE"]);

const tipoCupomSchema = z.enum(["PERCENTUAL", "VALOR_FIXO", "FRETE_GRATIS"]);

const cupomInputBase = {
  codigo: z.string().min(3),
  tipo: tipoCupomSchema,
  valor: z.number().positive().optional(),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  limiteUso: z.number().int().positive().optional(),
  produtoIds: z.array(z.string()).default([]),
  categoriaIds: z.array(z.string()).default([]),
};

const cupomInputRefinement = (
  data: { tipo: z.infer<typeof tipoCupomSchema>; valor?: number; inicio: Date; fim: Date },
  ctx: z.RefinementCtx,
) => {
  if (data.tipo !== "FRETE_GRATIS" && data.valor == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o valor do desconto.",
      path: ["valor"],
    });
  }
  if (data.tipo === "PERCENTUAL" && data.valor != null && data.valor > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O percentual não pode ser maior que 100.",
      path: ["valor"],
    });
  }
  if (data.fim < data.inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A data de término deve ser após o início.",
      path: ["fim"],
    });
  }
};

export const cuponsRouter = router({
  listar: storeProcedure.query(({ ctx }) => {
    return ctx.prisma.cupom.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { inicio: "desc" },
    });
  }),

  buscarPorId: storeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cupom = await ctx.prisma.cupom.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { produtos: true, categorias: true },
      });
      if (!cupom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cupom não encontrado." });
      }
      return cupom;
    }),

  // Usada pelo checkout (M11) para validar um código antes de aplicar o
  // desconto ao pedido: confere vigência, limite de uso e escopo por
  // produto/categoria — a mesma regra de negócio de PRD 3.10.
  validar: storeProcedure
    .input(z.object({ codigo: z.string(), produtoIds: z.array(z.string()).default([]) }))
    .query(async ({ ctx, input }) => {
      const cupom = await ctx.prisma.cupom.findFirst({
        where: { lojaId: ctx.lojaId, codigo: input.codigo.toUpperCase() },
        include: { produtos: true, categorias: true },
      });
      if (!cupom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cupom não encontrado." });
      }

      const agora = new Date();
      if (agora < cupom.inicio) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom ainda não está vigente." });
      }
      if (agora > cupom.fim) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom está expirado." });
      }
      if (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom atingiu o limite de uso." });
      }

      const restrito = cupom.produtos.length > 0 || cupom.categorias.length > 0;
      if (restrito) {
        const idsProdutosRestritos = new Set(cupom.produtos.map((p) => p.id));
        const aplicaAlgumProduto = input.produtoIds.some((id) => idsProdutosRestritos.has(id));
        if (!aplicaAlgumProduto) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este cupom não é válido para os produtos do carrinho.",
          });
        }
      }

      return cupom;
    }),

  criar: gestorProcedure
    .input(z.object(cupomInputBase).superRefine(cupomInputRefinement))
    .mutation(async ({ ctx, input }) => {
      const codigo = input.codigo.toUpperCase();
      const existente = await ctx.prisma.cupom.findFirst({
        where: { lojaId: ctx.lojaId, codigo },
      });
      if (existente) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um cupom com este código." });
      }

      return ctx.prisma.cupom.create({
        data: {
          lojaId: ctx.lojaId,
          codigo,
          tipo: input.tipo,
          valor: input.tipo === "FRETE_GRATIS" ? undefined : input.valor,
          inicio: input.inicio,
          fim: input.fim,
          limiteUso: input.limiteUso,
          produtos: { connect: input.produtoIds.map((id) => ({ id })) },
          categorias: { connect: input.categoriaIds.map((id) => ({ id })) },
        },
      });
    }),

  atualizar: gestorProcedure
    .input(z.object({ id: z.string(), ...cupomInputBase }).superRefine(cupomInputRefinement))
    .mutation(async ({ ctx, input }) => {
      const cupomExistente = await ctx.prisma.cupom.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!cupomExistente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cupom não encontrado." });
      }

      const codigo = input.codigo.toUpperCase();
      const outroComMesmoCodigo = await ctx.prisma.cupom.findFirst({
        where: { lojaId: ctx.lojaId, codigo, NOT: { id: input.id } },
      });
      if (outroComMesmoCodigo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um cupom com este código." });
      }

      return ctx.prisma.cupom.update({
        where: { id: input.id },
        data: {
          codigo,
          tipo: input.tipo,
          valor: input.tipo === "FRETE_GRATIS" ? null : input.valor,
          inicio: input.inicio,
          fim: input.fim,
          limiteUso: input.limiteUso,
          produtos: { set: input.produtoIds.map((id) => ({ id })) },
          categorias: { set: input.categoriaIds.map((id) => ({ id })) },
        },
      });
    }),

  remover: gestorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cupom = await ctx.prisma.cupom.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!cupom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cupom não encontrado." });
      }
      return ctx.prisma.cupom.delete({ where: { id: input.id } });
    }),
});
