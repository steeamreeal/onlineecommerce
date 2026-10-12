import type { PapelUsuario, PrismaClient, TipoSolicitacao } from "@prisma/client";

// Dono, Administrador e Gerente agem direto. Vendedor, Estoquista e Separador
// têm as mutations sensíveis (produtos, clientes, frete, estoque, pedidos)
// transformadas em Solicitacao pendente até um Dono/Gerente aprovar — ver
// server/trpc/routers/aprovacoes.ts.
//
// Administrador entra aqui porque tem acesso total à loja (usuários,
// domínio, pagamentos — PAPEL_USUARIO_DESCRICAO) e, em lojas criadas por
// auto-cadastro, é o único papel existente: sem isso as próprias
// solicitações dele ficariam sem ninguém para aprovar. As travas que o Dono
// controla (editor do site) continuam valendo para o Administrador.
const PAPEIS_ACAO_DIRETA: PapelUsuario[] = ["DONO", "ADMINISTRADOR", "GERENTE"];

export function precisaAprovacao(papel: PapelUsuario | null) {
  return !papel || !PAPEIS_ACAO_DIRETA.includes(papel);
}

export type ResultadoComAprovacao<T> = T | { pendente: true; solicitacaoId: string };

// Envolve a lógica de uma mutation sensível: Dono/Gerente executam `executar`
// direto; os demais papéis só gravam uma Solicitacao com o input já validado
// pelo schema Zod da mutation (payload), sem tocar no banco além disso — a
// lógica de negócio real só roda de fato na aprovação
// (aprovacoes.ts:aprovar), quando o estado (estoque, status do pedido etc.)
// é checado de novo, já que pode ter mudado entre pedir e aprovar.
export async function executarComAprovacao<T>(
  ctx: { prisma: PrismaClient; lojaId: string; usuario: { id: string }; papel: PapelUsuario | null },
  tipo: TipoSolicitacao,
  resumo: string,
  payload: unknown,
  executar: () => Promise<T>,
): Promise<ResultadoComAprovacao<T>> {
  if (!precisaAprovacao(ctx.papel)) {
    return executar();
  }

  const solicitacao = await ctx.prisma.solicitacao.create({
    data: {
      lojaId: ctx.lojaId,
      solicitanteId: ctx.usuario.id,
      tipo,
      resumo,
      payload: payload as object,
      status: "PENDENTE",
    },
  });

  return { pendente: true, solicitacaoId: solicitacao.id };
}
