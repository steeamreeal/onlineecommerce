import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { router, storeProcedure, roleProcedure, temaProcedure } from "../trpc";
import {
  temaConfigSchema,
  temaProdutoConfigSchema,
  configSelosSchema,
  extrairSelosSemente,
  ativarExibicaoLogo,
} from "@/lib/tema-loja";
import {
  adicionarDominioNaVercel,
  removerDominioDaVercel,
  statusDominioNaVercel,
  VercelDomainsIndisponivelError,
} from "@/lib/vercel-domains";

// Identidade, domínio próprio, personalização e tema da loja são decisões de
// quem administra a loja. DONO tem tudo que ADMINISTRADOR tem (ver
// equipeProcedure em usuarios-loja.ts).
const lojaProcedure = roleProcedure(["ADMINISTRADOR", "DONO"]);

export const lojaRouter = router({
  atual: storeProcedure.query(async ({ ctx }) => {
    const loja = await ctx.prisma.loja.findUniqueOrThrow({
      where: { id: ctx.lojaId },
      select: {
        id: true,
        nome: true,
        slug: true,
        logoUrl: true,
        planoId: true,
        statusPlano: true,
        stripeCustomerId: true,
        mpConectadoEm: true,
        dominioProprio: true,
        template: true,
        corPrimaria: true,
        banners: true,
        temaConfig: true,
        temaProdutoConfig: true,
        selosConfig: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        endereco: true,
        horarioAtend: true,
        politicas: true,
        telefoneSac: true,
        plano: { select: { id: true, nome: true, precoMensal: true } },
      },
    });
    return {
      ...loja,
      selosConfig: loja.selosConfig ?? extrairSelosSemente(loja.temaConfig),
    };
  }),

  // Nome e slug (URL da loja) não entram aqui: são geridos pelo admin da
  // plataforma via admin.atualizarLoja, já que a criação da loja não é mais
  // self-service (M14) e o slug é usado na resolução de tenant por host.
  atualizarIdentidade: lojaProcedure
    .input(
      z.object({
        corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
        logoUrl: z.string().min(1).nullable(),
        whatsapp: z.string().trim().max(30).optional(),
        instagram: z.string().trim().max(60).optional(),
        facebook: z.string().trim().max(60).optional(),
        endereco: z.string().trim().max(300).optional(),
        horarioAtend: z.string().trim().max(120).optional(),
        politicas: z.string().trim().max(2000).optional(),
        telefoneSac: z.string().trim().max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Ao definir uma logo, ativa "Exibir: Logo" no cabeçalho do tema —
      // senão o upload não muda nada visível no site (ver ativarExibicaoLogo).
      let temaConfigAtualizado: unknown | undefined;
      if (input.logoUrl) {
        const atual = await ctx.prisma.loja.findUniqueOrThrow({
          where: { id: ctx.lojaId },
          select: { temaConfig: true },
        });
        temaConfigAtualizado = ativarExibicaoLogo(atual.temaConfig);
      }

      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: {
          corPrimaria: input.corPrimaria,
          logoUrl: input.logoUrl,
          whatsapp: input.whatsapp || null,
          instagram: input.instagram || null,
          facebook: input.facebook || null,
          endereco: input.endereco || null,
          horarioAtend: input.horarioAtend || null,
          politicas: input.politicas || null,
          telefoneSac: input.telefoneSac || null,
          ...(temaConfigAtualizado !== undefined
            ? { temaConfig: temaConfigAtualizado as Prisma.InputJsonValue }
            : {}),
        },
        select: {
          corPrimaria: true,
          logoUrl: true,
          whatsapp: true,
          instagram: true,
          facebook: true,
          endereco: true,
          horarioAtend: true,
          politicas: true,
          telefoneSac: true,
        },
      });
    }),

  // Domínio próprio é opcional e único na plataforma inteira (não só por
  // loja) — precisa checar colisão com outra loja antes de salvar, já que
  // é o valor usado pelo middleware para resolver o tenant pelo host.
  //
  // Além de salvar no banco, cadastra o domínio no projeto da Vercel via API
  // (lib/vercel-domains.ts) — antes disso era um passo manual do admin da
  // plataforma em Settings → Domains a cada loja nova. Se a Vercel rejeitar
  // o domínio (já usado em outro projeto, inválido), a mutation falha inteira
  // e nada é salvo — o lojista só vê "salvo" quando de fato está ativo.
  // Se a integração não estiver configurada (sem VERCEL_API_TOKEN), cai de
  // volta pro fluxo manual antigo: salva no banco e o admin cadastra à mão.
  atualizarDominioProprio: lojaProcedure
    .input(z.object({ dominioProprio: z.string().trim().toLowerCase().min(1).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const dominio = input.dominioProprio?.replace(/^https?:\/\//, "").replace(/\/$/, "") || null;

      if (dominio) {
        const emUso = await ctx.prisma.loja.findFirst({
          where: { dominioProprio: dominio, id: { not: ctx.lojaId } },
          select: { id: true },
        });
        if (emUso) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este domínio já está em uso por outra loja.",
          });
        }
      }

      const lojaAtual = await ctx.prisma.loja.findUniqueOrThrow({
        where: { id: ctx.lojaId },
        select: { dominioProprio: true },
      });
      const dominioAnterior = lojaAtual.dominioProprio;

      if (dominio && dominio !== dominioAnterior) {
        try {
          await adicionarDominioNaVercel(dominio);
        } catch (erro) {
          if (erro instanceof VercelDomainsIndisponivelError) {
            // Integração não configurada nesta instalação — segue com o
            // fluxo manual antigo em vez de bloquear o lojista.
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: erro instanceof Error ? erro.message : "Não foi possível cadastrar o domínio.",
            });
          }
        }
      }

      // Domínio trocado ou removido: limpa o antigo da Vercel para não deixar
      // domínio órfão vinculado ao projeto. Melhor esforço — se a remoção
      // falhar (ex.: já não existia lá), não bloqueia o salvamento.
      if (dominioAnterior && dominioAnterior !== dominio) {
        await removerDominioDaVercel(dominioAnterior).catch(() => {});
      }

      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { dominioProprio: dominio },
        select: { dominioProprio: true },
      });
    }),

  // Consulta se o DNS do domínio próprio já está apontando corretamente
  // para a Vercel — usado pela tela de domínio próprio pra mostrar ao
  // lojista o status real em vez de só a instrução estática de CNAME.
  statusDominioProprio: lojaProcedure.query(async ({ ctx }) => {
    const loja = await ctx.prisma.loja.findUniqueOrThrow({
      where: { id: ctx.lojaId },
      select: { dominioProprio: true },
    });
    if (!loja.dominioProprio) return null;

    try {
      return await statusDominioNaVercel(loja.dominioProprio);
    } catch (erro) {
      if (erro instanceof VercelDomainsIndisponivelError) return null;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: erro instanceof Error ? erro.message : "Não foi possível consultar o status do domínio.",
      });
    }
  }),

  atualizarPersonalizacao: temaProcedure
    .input(
      z.object({
        template: z.enum(["MINIMALISTA", "EDITORIAL", "VITRINE"]),
        corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { template: input.template, corPrimaria: input.corPrimaria },
        select: { template: true, corPrimaria: true },
      });
    }),

  // Sobrescreve o array inteiro a cada chamada (banners não é uma relação
  // Prisma separada, é Json) — sem diff por id, mais simples que o padrão
  // usado em produtos.fotos.
  atualizarBanners: temaProcedure
    .input(
      z.object({
        banners: z
          .array(
            z.object({
              id: z.string().optional(),
              url: z.string().min(1),
              titulo: z.string(),
              tipo: z.enum(["IMAGEM", "VIDEO"]).default("IMAGEM"),
              urlMobile: z.string().optional(),
              tipoMobile: z.enum(["IMAGEM", "VIDEO"]).optional(),
            }),
          )
          .max(3, "No máximo 3 banners por loja."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { banners: input.banners },
        select: { banners: true },
      });
    }),

  // Editor de tema: sobrescreve temaConfig inteiro a cada save, mesmo padrão
  // de atualizarBanners (Json puro, sem diff por id). O template continua
  // sendo trocado por atualizarPersonalizacao — temaConfig só guarda a
  // composição de seções e o estilo (cor/fonte), não qual template está ativo.
  atualizarTema: temaProcedure
    .input(temaConfigSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { temaConfig: input },
        select: { temaConfig: true },
      });
    }),

  // Editor de tema da página de produto: mesmo padrão de atualizarTema
  // (Json puro, sobrescrito por inteiro), só que essa config vale para
  // TODOS os produtos da loja — não há personalização por produto individual.
  atualizarTemaProduto: temaProcedure
    .input(temaProdutoConfigSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { temaProdutoConfig: input },
        select: { temaProdutoConfig: true },
      });
    }),

  // Conteúdo dos selos de confiança, compartilhado entre a seção SELOS
  // (home) e SELOS_PRODUTO (produto) — salvo por qualquer um dos dois
  // editores, ver docs/superpowers/specs/2026-08-08-selos-confianca-unificados-design.md.
  atualizarSelos: temaProcedure
    .input(configSelosSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.loja.update({
        where: { id: ctx.lojaId },
        data: { selosConfig: input },
        select: { selosConfig: true },
      });
    }),
});
