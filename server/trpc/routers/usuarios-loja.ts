import { randomBytes } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, authedProcedure, storeProcedure, roleProcedure } from "../trpc";
import { enviarConviteLoja } from "@/lib/email/notificacoes";

const papelUsuarioSchema = z.enum(["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"]);

// Gerenciar quem tem acesso ao painel da loja e convidar novos membros é
// decisão de quem administra a loja — mesmo padrão de restrição usado para
// pagamentos/domínio em pagamentos.ts. DONO também passa por aqui (tem tudo
// que ADMINISTRADOR tem e mais as proteções abaixo).
const equipeProcedure = roleProcedure(["ADMINISTRADOR", "DONO"]);

const CONVITE_VALIDADE_HORAS = 72;

export const usuariosLojaRouter = router({
  // Lista os vínculos reais (UsuarioLoja) e os convites ainda não aceitos,
  // para a tela de Configurações > Usuários mostrar os dois num só lugar.
  // `souDono`/`existeDono` guiam a UI: transferir o papel de DONO só é
  // permitido para quem já é DONO — exceto quando a loja ainda não tem
  // nenhum (lojas criadas antes desse papel existir), caso em que qualquer
  // ADMINISTRADOR pode fazer a primeira atribuição.
  listar: storeProcedure.query(async ({ ctx }) => {
    const [usuarios, convites] = await Promise.all([
      ctx.prisma.usuarioLoja.findMany({
        where: { lojaId: ctx.lojaId },
        include: { usuario: { select: { nome: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      ctx.prisma.conviteUsuarioLoja.findMany({
        where: { lojaId: ctx.lojaId, aceitoEm: null, expiraEm: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      usuarios,
      convites,
      existeDono: usuarios.some((u) => u.papel === "DONO"),
      souDono: ctx.papel === "DONO",
    };
  }),

  convidar: equipeProcedure
    .input(z.object({ email: z.string().email(), papel: papelUsuarioSchema }))
    .mutation(async ({ ctx, input }) => {
      // DONO nunca é atribuído por convite (a pessoa pode nem ter conta
      // ainda) — só por transferência entre membros já existentes, via
      // alterarPapel.
      if (input.papel === "DONO") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "O papel de dono não pode ser atribuído por convite.",
        });
      }

      const email = input.email.toLowerCase();

      const usuarioExistente = await ctx.prisma.usuario.findUnique({
        where: { email },
        include: { lojas: { where: { lojaId: ctx.lojaId } } },
      });
      if (usuarioExistente && usuarioExistente.lojas.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já tem acesso a esta loja." });
      }

      const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

      // Reenviar convite (mesmo e-mail, ainda não aceito) reaproveita o token
      // existente — só renova prazo/papel. Gerar um token novo invalidaria
      // silenciosamente o link já enviado por e-mail antes de expirar de
      // verdade (quem clicasse no link antigo via "convite inválido").
      const conviteExistente = await ctx.prisma.conviteUsuarioLoja.findUnique({
        where: { lojaId_email: { lojaId: ctx.lojaId, email } },
      });
      const token =
        conviteExistente && !conviteExistente.aceitoEm ? conviteExistente.token : randomBytes(32).toString("hex");
      const expiraEm = new Date(Date.now() + CONVITE_VALIDADE_HORAS * 60 * 60 * 1000);

      const convite = await ctx.prisma.conviteUsuarioLoja.upsert({
        where: { lojaId_email: { lojaId: ctx.lojaId, email } },
        create: { lojaId: ctx.lojaId, email, papel: input.papel, token, expiraEm },
        update: { papel: input.papel, token, expiraEm, aceitoEm: null },
      });

      await enviarConviteLoja({ email, lojaNome: loja.nome, papel: input.papel, token });

      return convite;
    }),

  cancelarConvite: equipeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const convite = await ctx.prisma.conviteUsuarioLoja.findUnique({ where: { id: input.id } });
      if (!convite || convite.lojaId !== ctx.lojaId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      }
      await ctx.prisma.conviteUsuarioLoja.delete({ where: { id: input.id } });
      return { sucesso: true };
    }),

  alterarPapel: equipeProcedure
    .input(z.object({ usuarioLojaId: z.string(), papel: papelUsuarioSchema }))
    .mutation(async ({ ctx, input }) => {
      const vinculo = await ctx.prisma.usuarioLoja.findUnique({ where: { id: input.usuarioLojaId } });
      if (!vinculo || vinculo.lojaId !== ctx.lojaId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado nesta loja." });
      }

      // Ninguém além do próprio DONO mexe no papel dele — nem outro
      // ADMINISTRADOR.
      if (vinculo.papel === "DONO" && ctx.papel !== "DONO") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Só o dono da loja pode alterar o próprio papel.",
        });
      }

      if (input.papel === "DONO") {
        const donoAtual = await ctx.prisma.usuarioLoja.findFirst({
          where: { lojaId: ctx.lojaId, papel: "DONO" },
        });
        // Loja sem dono ainda (criada antes desse papel existir): qualquer
        // ADMINISTRADOR pode fazer a primeira atribuição. Com um dono já
        // definido, só ele pode transferir o papel pra outra pessoa.
        if (donoAtual && ctx.papel !== "DONO") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Só o dono atual da loja pode transferir esse papel para outra pessoa.",
          });
        }
        return ctx.prisma.$transaction(async (tx) => {
          if (donoAtual && donoAtual.id !== vinculo.id) {
            await tx.usuarioLoja.update({ where: { id: donoAtual.id }, data: { papel: "ADMINISTRADOR" } });
          }
          return tx.usuarioLoja.update({ where: { id: input.usuarioLojaId }, data: { papel: "DONO" } });
        });
      }

      return ctx.prisma.usuarioLoja.update({
        where: { id: input.usuarioLojaId },
        data: { papel: input.papel },
      });
    }),

  // Revoga o acesso de alguém à loja (diferente de cancelarConvite, que só
  // lida com convites ainda não aceitos). DONO nunca pode ser removido por
  // aqui — precisaria primeiro transferir o papel pra outra pessoa.
  remover: equipeProcedure
    .input(z.object({ usuarioLojaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const vinculo = await ctx.prisma.usuarioLoja.findUnique({ where: { id: input.usuarioLojaId } });
      if (!vinculo || vinculo.lojaId !== ctx.lojaId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado nesta loja." });
      }
      if (vinculo.papel === "DONO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "O dono da loja não pode ser removido." });
      }
      if (vinculo.usuarioId === ctx.usuario.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não pode remover o seu próprio acesso.",
        });
      }
      await ctx.prisma.usuarioLoja.delete({ where: { id: input.usuarioLojaId } });
      return { sucesso: true };
    }),

  // Dados públicos do convite (nome da loja, papel) para a página /convite/[token]
  // exibir antes da pessoa decidir aceitar — não exige sessão.
  buscarConvitePorToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const convite = await ctx.prisma.conviteUsuarioLoja.findUnique({
        where: { token: input.token },
        include: { loja: { select: { nome: true } } },
      });
      if (!convite || convite.aceitoEm || convite.expiraEm < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Este convite é inválido ou já expirou." });
      }
      return {
        email: convite.email,
        papel: convite.papel,
        lojaNome: convite.loja.nome,
      };
    }),

  // Confirma o convite: cria o Usuario (se a pessoa ainda não tinha, espelhando
  // sincronizarUsuario) e o UsuarioLoja na loja do convite, numa transação —
  // nunca deixar convite "aceito" sem o vínculo criado, ou vice-versa.
  aceitarConvite: authedProcedure
    .input(z.object({ token: z.string(), nome: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const convite = await ctx.prisma.conviteUsuarioLoja.findUnique({ where: { token: input.token } });
      if (!convite || convite.aceitoEm || convite.expiraEm < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Este convite é inválido ou já expirou." });
      }

      const { id: supabaseId, email } = ctx.supabaseUser;
      if (!email || email.toLowerCase() !== convite.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Este convite foi enviado para outro e-mail.",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        let usuario = await tx.usuario.findUnique({ where: { supabaseId } });
        if (!usuario) {
          usuario = await tx.usuario.create({ data: { supabaseId, nome: input.nome, email } });
        }

        await tx.usuarioLoja.upsert({
          where: { usuarioId_lojaId: { usuarioId: usuario.id, lojaId: convite.lojaId } },
          create: { usuarioId: usuario.id, lojaId: convite.lojaId, papel: convite.papel },
          update: { papel: convite.papel },
        });

        await tx.conviteUsuarioLoja.update({
          where: { id: convite.id },
          data: { aceitoEm: new Date() },
        });

        return { lojaId: convite.lojaId };
      });
    }),
});
