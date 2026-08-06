import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, superAdminProcedure } from "../trpc";
import { enviarConviteLoja } from "@/lib/email/notificacoes";

const statusLojaSchema = z.enum(["ATIVO", "BLOQUEADO", "CANCELADO", "TESTE"]);
const papelAdminSchema = z.enum(["SUPER_ADMIN", "SUPORTE", "FINANCEIRO"]);

const CONVITE_VALIDADE_HORAS = 72;

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

  // Destrava o primeiro acesso de uma loja recém-criada: como
  // usuariosLoja.convidar exige ser ADMINISTRADOR da própria loja, uma loja
  // sem ninguém vinculado ainda fica sem ninguém que possa convidar — o dono
  // da plataforma preenche essa lacuna convidando o primeiro Administrador.
  convidarAdministrador: superAdminProcedure
    .input(z.object({ lojaId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();

      const loja = await ctx.prisma.loja.findUnique({ where: { id: input.lojaId } });
      if (!loja) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Loja não encontrada." });
      }

      const usuarioExistente = await ctx.prisma.usuario.findUnique({
        where: { email },
        include: { lojas: { where: { lojaId: input.lojaId } } },
      });
      if (usuarioExistente && usuarioExistente.lojas.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já tem acesso a esta loja." });
      }

      const token = randomBytes(32).toString("hex");
      const expiraEm = new Date(Date.now() + CONVITE_VALIDADE_HORAS * 60 * 60 * 1000);

      const convite = await ctx.prisma.conviteUsuarioLoja.upsert({
        where: { lojaId_email: { lojaId: input.lojaId, email } },
        create: { lojaId: input.lojaId, email, papel: "ADMINISTRADOR", token, expiraEm },
        update: { papel: "ADMINISTRADOR", token, expiraEm, aceitoEm: null },
      });

      await enviarConviteLoja({ email, lojaNome: loja.nome, papel: "ADMINISTRADOR", token });

      return convite;
    }),

  // Lista quem tem acesso a uma loja (equipe do lojista) — usada na tela de
  // detalhe da loja no admin, principalmente pro resgate de emergência do
  // papel de Dono abaixo.
  listarUsuariosLoja: adminProcedure
    .input(z.object({ lojaId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.usuarioLoja.findMany({
        where: { lojaId: input.lojaId },
        include: { usuario: { select: { nome: true, email: true } } },
        orderBy: { createdAt: "asc" },
      });
    }),

  // Resgate de emergência: o fluxo normal (usuariosLoja.alterarPapel) só
  // deixa o próprio Dono transferir esse papel — se o lojista transferir
  // sem querer pro usuário errado (ex.: um vendedor), ninguém dentro da
  // loja consegue mais desfazer sozinho. O dono da plataforma pode corrigir
  // aqui, contornando essa trava. Fora desse caso excepcional, a plataforma
  // não deveria mexer nos papéis internos de uma loja.
  definirDonoLoja: superAdminProcedure
    .input(z.object({ usuarioLojaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vinculo = await ctx.prisma.usuarioLoja.findUnique({ where: { id: input.usuarioLojaId } });
      if (!vinculo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado nesta loja." });
      }
      return ctx.prisma.$transaction(async (tx) => {
        await tx.usuarioLoja.updateMany({
          where: { lojaId: vinculo.lojaId, papel: "DONO", id: { not: vinculo.id } },
          data: { papel: "ADMINISTRADOR" },
        });
        return tx.usuarioLoja.update({ where: { id: input.usuarioLojaId }, data: { papel: "DONO" } });
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
