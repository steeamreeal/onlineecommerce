import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure, roleProcedure } from "../trpc";

// Conteúdo institucional afeta o site público da loja — mesma régua de
// permissão usada para identidade/tema (ver lojaProcedure em loja.ts).
const gestorProcedure = roleProcedure(["ADMINISTRADOR", "DONO"]);

// Títulos sugeridos, semeados com conteúdo vazio na primeira vez que o
// lojista abre a tela. Depois de criados são registros comuns — sem flag
// "é sugerida" no banco.
export const PAGINAS_SUGERIDAS = [
  "Política de privacidade",
  "Trocas e devoluções",
  "Garantia",
  "Dúvidas frequentes",
  "Sobre a loja",
  "Regulamentos",
];

const DIACRITICOS_REGEX = new RegExp("[̀-ͯ]", "g");

function gerarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(DIACRITICOS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function slugDisponivel(
  prisma: import("@prisma/client").PrismaClient,
  lojaId: string,
  slugBase: string,
  ignorarId?: string,
) {
  let slug = slugBase || "pagina";
  let sufixo = 1;
  // Poucas páginas por loja — busca sequencial simples é suficiente.
  while (
    await prisma.paginaInstitucional.findFirst({
      where: { lojaId, slug, id: ignorarId ? { not: ignorarId } : undefined },
    })
  ) {
    sufixo += 1;
    slug = `${slugBase || "pagina"}-${sufixo}`;
  }
  return slug;
}

export const paginasInstitucionaisRouter = router({
  listar: storeProcedure.query(async ({ ctx }) => {
    const paginas = await ctx.prisma.paginaInstitucional.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { ordem: "asc" },
    });

    if (paginas.length > 0) return paginas;

    // Primeira vez que a loja abre a tela: semeia as páginas sugeridas com
    // conteúdo vazio, pra já aparecerem prontas pra editar.
    await ctx.prisma.paginaInstitucional.createMany({
      data: await Promise.all(
        PAGINAS_SUGERIDAS.map(async (titulo, ordem) => ({
          lojaId: ctx.lojaId,
          titulo,
          slug: await slugDisponivel(ctx.prisma, ctx.lojaId, gerarSlug(titulo)),
          conteudo: "",
          ordem,
        })),
      ),
    });

    return ctx.prisma.paginaInstitucional.findMany({
      where: { lojaId: ctx.lojaId },
      orderBy: { ordem: "asc" },
    });
  }),

  criar: gestorProcedure
    .input(
      z.object({
        titulo: z.string().trim().min(1, "Informe um título").max(120),
        conteudo: z.string().trim().max(20000).default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const maiorOrdem = await ctx.prisma.paginaInstitucional.aggregate({
        where: { lojaId: ctx.lojaId },
        _max: { ordem: true },
      });
      const slug = await slugDisponivel(ctx.prisma, ctx.lojaId, gerarSlug(input.titulo));
      return ctx.prisma.paginaInstitucional.create({
        data: {
          lojaId: ctx.lojaId,
          titulo: input.titulo,
          conteudo: input.conteudo,
          slug,
          ordem: (maiorOrdem._max.ordem ?? -1) + 1,
        },
      });
    }),

  atualizar: gestorProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().trim().min(1, "Informe um título").max(120),
        conteudo: z.string().trim().max(20000).default(""),
        ordem: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pagina = await ctx.prisma.paginaInstitucional.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!pagina) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Página não encontrada." });
      }

      const slug =
        input.titulo === pagina.titulo
          ? pagina.slug
          : await slugDisponivel(ctx.prisma, ctx.lojaId, gerarSlug(input.titulo), pagina.id);

      return ctx.prisma.paginaInstitucional.update({
        where: { id: pagina.id },
        data: {
          titulo: input.titulo,
          conteudo: input.conteudo,
          slug,
          ordem: input.ordem ?? pagina.ordem,
        },
      });
    }),

  excluir: gestorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pagina = await ctx.prisma.paginaInstitucional.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      if (!pagina) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Página não encontrada." });
      }
      await ctx.prisma.paginaInstitucional.delete({ where: { id: pagina.id } });
      return { ok: true };
    }),
});
