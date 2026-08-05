import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, superAdminProcedure } from "../trpc";

const statusLojaSchema = z.enum(["ATIVO", "BLOQUEADO", "CANCELADO", "TESTE"]);
const papelAdminSchema = z.enum(["SUPER_ADMIN", "SUPORTE", "FINANCEIRO"]);

export const adminRouter = router({
  listarLojas: adminProcedure
    .input(
      z
        .object({
          busca: z.string().optional(),
          status: statusLojaSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const lojas = await ctx.prisma.loja.findMany({
        where: {
          statusPlano: input?.status,
          nome: input?.busca ? { contains: input.busca, mode: "insensitive" } : undefined,
        },
        include: {
          plano: { select: { id: true, nome: true, precoMensal: true } },
          _count: { select: { pedidos: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const faturamentos = await ctx.prisma.pedido.groupBy({
        by: ["lojaId"],
        where: { lojaId: { in: lojas.map((l) => l.id) }, status: { not: "CANCELADO" } },
        _sum: { valorTotal: true },
      });
      const faturamentoPorLoja = new Map(
        faturamentos.map((f) => [f.lojaId, Number(f._sum.valorTotal ?? 0)]),
      );

      return lojas.map((loja) => ({
        ...loja,
        faturamentoTotal: faturamentoPorLoja.get(loja.id) ?? 0,
        numeroPedidos: loja._count.pedidos,
      }));
    }),

  obterLoja: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const loja = await ctx.prisma.loja.findUnique({
        where: { id: input.id },
        include: {
          plano: true,
          usuarios: {
            where: { papel: "ADMINISTRADOR" },
            take: 1,
            orderBy: { createdAt: "asc" },
            include: { usuario: { select: { nome: true, email: true } } },
          },
        },
      });
      if (!loja) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Loja não encontrada." });
      }

      const [agregadoPedidos, numeroProdutos] = await Promise.all([
        ctx.prisma.pedido.aggregate({
          where: { lojaId: loja.id, status: { not: "CANCELADO" } },
          _sum: { valorTotal: true },
          _count: true,
        }),
        ctx.prisma.produto.count({ where: { lojaId: loja.id } }),
      ]);

      const responsavel = loja.usuarios[0]?.usuario;

      return {
        ...loja,
        responsavel: loja.responsavel ?? responsavel?.nome ?? null,
        emailContato: loja.emailContato ?? responsavel?.email ?? null,
        faturamentoTotal: Number(agregadoPedidos._sum.valorTotal ?? 0),
        numeroPedidos: agregadoPedidos._count,
        numeroProdutos,
      };
    }),

  // Cria a loja já pronta pelo dono da plataforma (projeto fechado sob
  // encomenda) — diferente de onboarding.criarLoja, que é o cadastro
  // self-service do próprio lojista (os dois caminhos convivem).
  criarLoja: superAdminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
        responsavel: z.string().min(2),
        emailContato: z.string().email(),
        planoId: z.string().optional(),
        statusPlano: statusLojaSchema.default("ATIVO"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slugEmUso = await ctx.prisma.loja.findUnique({ where: { slug: input.slug } });
      if (slugEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este endereço de loja já está em uso." });
      }

      return ctx.prisma.loja.create({
        data: {
          nome: input.nome,
          slug: input.slug,
          responsavel: input.responsavel,
          emailContato: input.emailContato,
          planoId: input.planoId,
          statusPlano: input.statusPlano,
        },
      });
    }),

  atualizarLoja: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
        responsavel: z.string().min(2),
        emailContato: z.string().email(),
        planoId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slugEmUso = await ctx.prisma.loja.findFirst({
        where: { slug: input.slug, id: { not: input.id } },
      });
      if (slugEmUso) {
        throw new TRPCError({ code: "CONFLICT", message: "Este endereço de loja já está em uso." });
      }

      return ctx.prisma.loja.update({
        where: { id: input.id },
        data: {
          nome: input.nome,
          slug: input.slug,
          responsavel: input.responsavel,
          emailContato: input.emailContato,
          planoId: input.planoId ?? null,
        },
      });
    }),

  bloquearLoja: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: input.id },
        data: { statusPlano: "BLOQUEADO" },
      });
    }),

  liberarLoja: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: input.id },
        data: { statusPlano: "ATIVO" },
      });
    }),

  listarPlanos: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.plano.findMany({
      include: { _count: { select: { lojas: true } } },
      orderBy: { precoMensal: "asc" },
    });
  }),

  criarPlano: superAdminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        precoMensal: z.number().positive(),
        stripePriceId: z.string().optional(),
        limiteProdutos: z.number().int().positive().optional(),
        limiteUsuarios: z.number().int().positive().optional(),
        features: z.array(z.string()).default([]),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.plano.create({ data: input });
    }),

  atualizarPlano: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2),
        precoMensal: z.number().positive(),
        stripePriceId: z.string().optional(),
        limiteProdutos: z.number().int().positive().optional(),
        limiteUsuarios: z.number().int().positive().optional(),
        features: z.array(z.string()).default([]),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.plano.update({ where: { id }, data });
    }),

  // Usuários com acesso ao painel administrativo do SaaS (papelAdmin
  // preenchido) — camada separada dos lojistas (Usuario.lojas).
  listarUsuariosPlataforma: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.usuario.findMany({
      where: { papelAdmin: { not: null } },
      select: { id: true, nome: true, email: true, papelAdmin: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Concede acesso ao painel admin a um usuário já cadastrado (precisa já
  // ter feito login ao menos uma vez via Supabase Auth / auth.sincronizarUsuario)
  // — não envia convite por e-mail, só habilita o papel.
  concederAcessoPlataforma: superAdminProcedure
    .input(z.object({ email: z.string().email(), papel: papelAdminSchema }))
    .mutation(async ({ ctx, input }) => {
      const usuario = await ctx.prisma.usuario.findUnique({ where: { email: input.email } });
      if (!usuario) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum usuário com este e-mail fez login na plataforma ainda.",
        });
      }
      return ctx.prisma.usuario.update({
        where: { id: usuario.id },
        data: { papelAdmin: input.papel },
      });
    }),

  alterarPapelUsuarioPlataforma: superAdminProcedure
    .input(z.object({ id: z.string(), papel: papelAdminSchema }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.usuario.update({
        where: { id: input.id },
        data: { papelAdmin: input.papel },
      });
    }),

  revogarAcessoPlataforma: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.usuario.update({
        where: { id: input.id },
        data: { papelAdmin: null },
      });
    }),

  metricas: adminProcedure.query(async ({ ctx }) => {
    const [totalLojas, lojasPorStatusRaw, planosAtivos, agregadoPedidos, novasLojasNoMes] =
      await Promise.all([
        ctx.prisma.loja.count(),
        ctx.prisma.loja.groupBy({ by: ["statusPlano"], _count: true }),
        ctx.prisma.loja.findMany({
          where: { statusPlano: "ATIVO" },
          select: { plano: { select: { precoMensal: true } } },
        }),
        ctx.prisma.pedido.aggregate({
          where: { status: { not: "CANCELADO" } },
          _sum: { valorTotal: true },
        }),
        ctx.prisma.loja.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

    const lojasPorStatus = {
      ATIVO: 0,
      BLOQUEADO: 0,
      CANCELADO: 0,
      TESTE: 0,
      ...Object.fromEntries(lojasPorStatusRaw.map((g) => [g.statusPlano, g._count])),
    };

    const mrr = planosAtivos.reduce((soma, l) => soma + Number(l.plano?.precoMensal ?? 0), 0);

    const lojasPorPlanoRaw = await ctx.prisma.loja.groupBy({
      by: ["planoId"],
      _count: true,
    });
    const planos = await ctx.prisma.plano.findMany({
      where: { id: { in: lojasPorPlanoRaw.map((l) => l.planoId).filter((id): id is string => !!id) } },
      select: { id: true, nome: true },
    });
    const nomePorPlanoId = new Map(planos.map((p) => [p.id, p.nome]));
    const lojasPorPlano = lojasPorPlanoRaw.map((item) => ({
      planoId: item.planoId,
      planoNome: item.planoId ? (nomePorPlanoId.get(item.planoId) ?? "Plano removido") : "Sem plano",
      quantidade: item._count,
    }));

    return {
      mrr,
      totalLojas,
      novasLojasNoMes,
      faturamentoTotalPlataforma: Number(agregadoPedidos._sum.valorTotal ?? 0),
      lojasPorStatus,
      lojasPorPlano,
    };
  }),
});
