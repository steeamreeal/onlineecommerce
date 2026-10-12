import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { router, storeProcedure, roleProcedure } from "../trpc";
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";
import { calcularDescontoCupom } from "@/lib/cupons";
import {
  buscarEmailAdministradorLoja,
  notificarEstoqueBaixo,
  notificarPedidoConfirmado,
  notificarStatusAtualizado,
} from "@/lib/email/notificacoes";
import { executarComAprovacao } from "../aprovacao";

const statusPedidoSchema = z.enum([
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
  "CANCELADO",
]);

// Mesma ordem de lib/mocks/pedidos.ts (STATUS_PEDIDO_ORDEM) — o kanban só
// permite avançar para o próximo da lista, nunca pular etapas ou voltar.
const ORDEM_STATUS = [
  "NOVO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_PREPARACAO",
  "ENVIADO",
  "PRONTO_RETIRADA",
  "ENTREGUE",
] as const;

function proximoStatusValido(atual: z.infer<typeof statusPedidoSchema>) {
  if (atual === "CANCELADO") return undefined;
  const indice = ORDEM_STATUS.indexOf(atual as (typeof ORDEM_STATUS)[number]);
  return ORDEM_STATUS[indice + 1];
}

export const formaPagamentoSchema = z.enum([
  "PIX",
  "CARTAO",
  "BOLETO",
  "LINK_PAGAMENTO",
  "PAGAMENTO_ENTREGA",
]);

export const itemPedidoInputSchema = z.object({
  produtoId: z.string(),
  variacaoId: z.string().optional(),
  // Teto por item: sem ele, um único pedido anônimo poderia zerar o estoque
  // de qualquer produto com uma quantidade absurda.
  quantidade: z.number().int().positive().max(999),
});

// Decrementa o estoque das variações do pedido de forma atômica, com a
// mesma técnica de update condicionado de estoque.ts (updateMany com
// gte no where) para não haver TOCTOU entre checar saldo e decrementar.
// Lança BAD_REQUEST se qualquer item não tiver saldo suficiente.
// Exportada para reuso pelo checkout público (checkout.ts).
export async function baixarEstoqueItens(
  tx: Prisma.TransactionClient,
  itens: { variacaoId?: string; quantidade: number }[],
  loja: { id: string; nome: string },
) {
  for (const item of itens) {
    if (!item.variacaoId) continue;
    const antes = await tx.variacaoProduto.findUniqueOrThrow({ where: { id: item.variacaoId } });
    // `produto.lojaId` no where: a variação precisa pertencer a esta loja,
    // senão um id de variação de outra loja (expostos pela vitrine pública)
    // seria baixado por um pedido de qualquer tenant.
    const resultado = await tx.variacaoProduto.updateMany({
      where: { id: item.variacaoId, estoque: { gte: item.quantidade }, produto: { lojaId: loja.id } },
      data: { estoque: { decrement: item.quantidade } },
    });
    if (resultado.count === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Estoque insuficiente para um dos itens do pedido.",
      });
    }
    await tx.movimentoEstoque.create({
      data: {
        variacaoId: item.variacaoId,
        quantidade: item.quantidade,
        tipo: "SAIDA",
        motivo: "Venda (pedido)",
      },
    });

    // Só notifica no momento em que o estoque cruza o limite (antes estava
    // acima, agora está em ou abaixo) — evita notificar de novo a cada venda
    // enquanto o estoque já está baixo.
    const depois = antes.estoque - item.quantidade;
    if (antes.estoque > ESTOQUE_BAIXO_LIMITE && depois <= ESTOQUE_BAIXO_LIMITE) {
      const produto = await tx.produto.findUniqueOrThrow({ where: { id: antes.produtoId } });
      const emailAdmin = await buscarEmailAdministradorLoja(tx, loja.id);
      await notificarEstoqueBaixo(tx, {
        lojaId: loja.id,
        lojaNome: loja.nome,
        lojistaEmail: emailAdmin,
        produtoNome: produto.nome,
        variacaoLabel: variacaoLabel(antes),
        estoqueAtual: depois,
      });
    }
  }
}

// Exportada para reuso pela expiração automática de pedidos não pagos
// (lib/pedidos-expiracao.ts).
export async function devolverEstoqueItens(
  tx: Prisma.TransactionClient,
  itens: { variacaoId: string | null; quantidade: number }[],
  motivo: string = "Cancelamento de pedido",
) {
  for (const item of itens) {
    if (!item.variacaoId) continue;
    await tx.variacaoProduto.update({
      where: { id: item.variacaoId },
      data: { estoque: { increment: item.quantidade } },
    });
    await tx.movimentoEstoque.create({
      data: {
        variacaoId: item.variacaoId,
        quantidade: item.quantidade,
        tipo: "ENTRADA",
        motivo,
      },
    });
  }
}

// Valida os itens contra a loja e devolve cada um com preço e variação já
// resolvidos no servidor — nada do que o client manda além de ids/quantidade
// é confiado. Regras:
// - produto precisa ser da loja (e, no site público, estar ATIVO/DESTAQUE);
// - `variacaoId` precisa pertencer a ESSE produto (nunca a outro produto ou
//   a outra loja); se omitido, só é aceito quando o produto tem uma única
//   variação (caso contrário a baixa de estoque seria pulada).
// Exportada para reuso pelo checkout público (checkout.ts).
export async function calcularValorItens(
  prisma: PrismaClient,
  lojaId: string,
  itens: z.infer<typeof itemPedidoInputSchema>[],
  opcoes: { apenasAtivos?: boolean } = {},
) {
  const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
  const produtos = await prisma.produto.findMany({
    where: {
      id: { in: produtoIds },
      lojaId,
      ...(opcoes.apenasAtivos ? { status: { in: ["ATIVO", "DESTAQUE"] } } : {}),
    },
  });
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));

  if (produtosPorId.size !== produtoIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Um ou mais produtos são inválidos." });
  }

  const variacoes = await prisma.variacaoProduto.findMany({
    where: { produtoId: { in: produtoIds } },
    select: { id: true, produtoId: true },
  });
  const variacoesPorProduto = new Map<string, string[]>();
  for (const v of variacoes) {
    variacoesPorProduto.set(v.produtoId, [...(variacoesPorProduto.get(v.produtoId) ?? []), v.id]);
  }

  return itens.map((item) => {
    const produto = produtosPorId.get(item.produtoId)!;
    const doProduto = variacoesPorProduto.get(item.produtoId) ?? [];

    let variacaoId = item.variacaoId;
    if (variacaoId) {
      if (!doProduto.includes(variacaoId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Variação inválida para um dos produtos." });
      }
    } else if (doProduto.length === 1) {
      variacaoId = doProduto[0];
    } else if (doProduto.length > 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione a variação de todos os produtos." });
    }

    const precoUnit = produto.precoPromo ?? produto.precoNormal;
    return {
      produtoId: item.produtoId,
      variacaoId,
      quantidade: item.quantidade,
      categoriaId: produto.categoriaId,
      precoUnit: Number(precoUnit),
    };
  });
}

// Incrementa o uso do cupom respeitando `limiteUso` de forma atômica (o
// where condicionado impede que duas compras simultâneas passem do limite).
// Exportada para reuso pelo checkout público (checkout.ts).
export async function consumirCupom(
  tx: Prisma.TransactionClient,
  cupom: { id: string; limiteUso: number | null },
) {
  const { count } = await tx.cupom.updateMany({
    where: {
      id: cupom.id,
      ...(cupom.limiteUso != null ? { usosAtuais: { lt: cupom.limiteUso } } : {}),
    },
    data: { usosAtuais: { increment: 1 } },
  });
  if (count === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Este cupom atingiu o limite de uso." });
  }
}

export const pedidoCriarSchema = z.object({
  clienteId: z.string(),
  formaPagamento: formaPagamentoSchema,
  itens: z.array(itemPedidoInputSchema).min(1),
  valorFrete: z.number().min(0).default(0),
  cupomCodigo: z.string().optional(),
});
type PedidoCriarInput = z.infer<typeof pedidoCriarSchema>;

export const pedidoAtualizarStatusSchema = z.object({ id: z.string(), status: statusPedidoSchema });
type PedidoAtualizarStatusInput = z.infer<typeof pedidoAtualizarStatusSchema>;

export const pedidoAtualizarRastreioSchema = z.object({ id: z.string(), codigoRastreio: z.string().min(1) });
type PedidoAtualizarRastreioInput = z.infer<typeof pedidoAtualizarRastreioSchema>;

export async function executarPedidoCriar(
  // usuarioId = quem registrou a venda (vira Pedido.criadoPorId). Na
  // aprovação (aprovacoes.ts) é o SOLICITANTE, não quem aprovou.
  ctx: { prisma: PrismaClient; lojaId: string; usuarioId?: string },
  input: PedidoCriarInput,
) {
  const cliente = await ctx.prisma.cliente.findFirst({
    where: { id: input.clienteId, lojaId: ctx.lojaId },
  });
  if (!cliente) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
  }
  const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

  const itensComPreco = await calcularValorItens(ctx.prisma, ctx.lojaId, input.itens);
  const valorProdutos = itensComPreco.reduce((s, i) => s + i.precoUnit * i.quantidade, 0);

  let cupomUsado: { id: string; limiteUso: number | null } | undefined;
  let valorDesconto = 0;
  let valorFrete = input.valorFrete;

  if (input.cupomCodigo) {
    const cupom = await ctx.prisma.cupom.findFirst({
      where: { lojaId: ctx.lojaId, codigo: input.cupomCodigo.toUpperCase() },
      include: { produtos: { select: { id: true } }, categorias: { select: { id: true } } },
    });
    const agora = new Date();
    if (
      !cupom ||
      agora < cupom.inicio ||
      agora > cupom.fim ||
      (cupom.limiteUso != null && cupom.usosAtuais >= cupom.limiteUso)
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cupom inválido ou expirado." });
    }
    const calculo = calcularDescontoCupom(cupom, itensComPreco, valorFrete);
    if (!calculo) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Este cupom não é válido para os produtos do pedido.",
      });
    }
    cupomUsado = { id: cupom.id, limiteUso: cupom.limiteUso };
    valorDesconto = calculo.valorDesconto;
    valorFrete = calculo.valorFrete;
  }
  const cupomId = cupomUsado?.id;

  const valorTotal = Math.max(0, valorProdutos + valorFrete - valorDesconto);

  return ctx.prisma.$transaction(async (tx) => {
    await baixarEstoqueItens(tx, itensComPreco, loja);

    if (cupomUsado) {
      await consumirCupom(tx, cupomUsado);
    }

    const pedido = await tx.pedido.create({
      data: {
        lojaId: ctx.lojaId,
        clienteId: input.clienteId,
        formaPagamento: input.formaPagamento,
        valorFrete,
        valorDesconto,
        valorTotal,
        cupomId,
        criadoPorId: ctx.usuarioId,
        itens: {
          create: itensComPreco.map((item) => ({
            produtoId: item.produtoId,
            variacaoId: item.variacaoId,
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
          })),
        },
      },
      include: { itens: true, cliente: true, cupom: true },
    });

    await notificarPedidoConfirmado(tx, {
      lojaId: loja.id,
      lojaNome: loja.nome,
      clienteNome: cliente.nome,
      clienteEmail: cliente.email,
      pedidoId: pedido.id,
      valorTotal,
    });

    return pedido;
  });
}

export async function executarPedidoAtualizarStatus(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: PedidoAtualizarStatusInput,
) {
  const pedido = await ctx.prisma.pedido.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
    include: { itens: true, cliente: true },
  });
  if (!pedido) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
  }
  if (pedido.status === "CANCELADO" || pedido.status === "ENTREGUE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Este pedido não pode mais mudar de status.",
    });
  }

  const ehCancelamento = input.status === "CANCELADO";
  if (!ehCancelamento && input.status !== proximoStatusValido(pedido.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Transição de status inválida — siga a ordem do fluxo do pedido.",
    });
  }

  const loja = await ctx.prisma.loja.findUniqueOrThrow({ where: { id: ctx.lojaId } });

  return ctx.prisma.$transaction(async (tx) => {
    if (ehCancelamento) {
      await devolverEstoqueItens(tx, pedido.itens);
      if (pedido.cupomId) {
        await tx.cupom.update({
          where: { id: pedido.cupomId },
          data: { usosAtuais: { decrement: 1 } },
        });
      }
    }

    const pedidoAtualizado = await tx.pedido.update({
      where: { id: input.id },
      data: { status: input.status },
      include: { itens: true, cliente: true, cupom: true },
    });

    await notificarStatusAtualizado(tx, {
      lojaId: loja.id,
      lojaNome: loja.nome,
      clienteNome: pedido.cliente.nome,
      clienteEmail: pedido.cliente.email,
      pedidoId: pedido.id,
      status: input.status,
    });

    return pedidoAtualizado;
  });
}

export async function executarPedidoAtualizarRastreio(
  ctx: { prisma: PrismaClient; lojaId: string },
  input: PedidoAtualizarRastreioInput,
) {
  const pedido = await ctx.prisma.pedido.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
  });
  if (!pedido) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
  }
  return ctx.prisma.pedido.update({
    where: { id: input.id },
    data: { codigoRastreio: input.codigoRastreio },
  });
}

// CPF/CNPJ do cliente só vai para quem gerencia a loja. Estoquista, Vendedor
// e Separador precisam de nome, telefone e endereço para separar/enviar, mas
// não do documento (clientes.listar já é restrito a Dono/Gerente).
const PAPEIS_COM_DOCUMENTO = ["DONO", "ADMINISTRADOR", "GERENTE"];

function ocultarDocumentoCliente<T extends { cliente: { documento: string | null } }>(
  pedido: T,
  papel: string | null,
): T {
  if (papel && PAPEIS_COM_DOCUMENTO.includes(papel)) return pedido;
  return { ...pedido, cliente: { ...pedido.cliente, documento: null } };
}

// Vendedor só enxerga/mexe nos pedidos que ele mesmo registrou (venda manual).
// Pedidos do site (sem autor) e de outros vendedores ficam fora dele.
function escopoVendedor(papel: string | null, usuarioId: string) {
  return papel === "VENDEDOR" ? { criadoPorId: usuarioId } : {};
}

async function garantirPedidoVisivel(
  ctx: { prisma: PrismaClient; lojaId: string; papel: string | null; usuario: { id: string } },
  pedidoId: string,
) {
  if (ctx.papel !== "VENDEDOR") return;
  const meu = await ctx.prisma.pedido.findFirst({
    where: { id: pedidoId, lojaId: ctx.lojaId, ...escopoVendedor(ctx.papel, ctx.usuario.id) },
    select: { id: true },
  });
  if (!meu) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
  }
}

// Estoquista cuida de produtos e estoque, não de pedidos de clientes (nome,
// telefone, endereço). Dono, Administrador e Gerente gerenciam; Vendedor vê só
// os dele (escopoVendedor); Separador separa e envia.
const pedidosProcedure = roleProcedure(["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR", "SEPARADOR"]);

export const pedidosRouter = router({
  listar: pedidosProcedure
    .input(z.object({ status: statusPedidoSchema.optional(), busca: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const termo = input?.busca?.trim();
      const pedidos = await ctx.prisma.pedido.findMany({
        where: {
          lojaId: ctx.lojaId,
          ...escopoVendedor(ctx.papel, ctx.usuario.id),
          status: input?.status,
          ...(termo
            ? {
                OR: [
                  { id: { contains: termo, mode: "insensitive" } },
                  { cliente: { nome: { contains: termo, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: { cliente: true, itens: true, cupom: true },
        orderBy: { createdAt: "desc" },
      });
      return pedidos.map((pedido) => ocultarDocumentoCliente(pedido, ctx.papel));
    }),

  buscarPorId: pedidosProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pedido = await ctx.prisma.pedido.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId, ...escopoVendedor(ctx.papel, ctx.usuario.id) },
        include: {
          cliente: { include: { enderecos: true } },
          itens: { include: { produto: true, variacao: true } },
          cupom: true,
        },
      });
      if (!pedido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
      }
      return ocultarDocumentoCliente(pedido, ctx.papel);
    }),

  criar: pedidosProcedure
    .input(pedidoCriarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "PEDIDO_CRIAR", "Novo pedido (venda manual)", input, () =>
        executarPedidoCriar({ ...ctx, usuarioId: ctx.usuario.id }, input),
      ),
    ),

  // Avança o pedido para o próximo status da esteira (kanban) ou para
  // CANCELADO — nunca aceita pular etapas nem voltar, replicando a regra de
  // proximoStatus() do mock. Cancelar devolve o estoque baixado na criação.
  atualizarStatus: pedidosProcedure
    .input(pedidoAtualizarStatusSchema)
    .mutation(async ({ ctx, input }) => {
      await garantirPedidoVisivel(ctx, input.id);
      return executarComAprovacao(
        ctx,
        "PEDIDO_ATUALIZAR_STATUS",
        `Atualizar status do pedido para ${input.status}`,
        input,
        () => executarPedidoAtualizarStatus(ctx, input),
      );
    }),

  atualizarRastreio: pedidosProcedure
    .input(pedidoAtualizarRastreioSchema)
    .mutation(async ({ ctx, input }) => {
      await garantirPedidoVisivel(ctx, input.id);
      return executarComAprovacao(
        ctx,
        "PEDIDO_ATUALIZAR_RASTREIO",
        "Atualizar código de rastreio do pedido",
        input,
        () => executarPedidoAtualizarRastreio(ctx, input),
      );
    }),

  // "Minhas vendas": resumo dos pedidos que o próprio usuário registrou.
  // Para o Vendedor é o único número de venda que ele enxerga (o dashboard
  // financeiro da loja é só de Dono/Administrador/Gerente).
  resumoMinhasVendas: storeProcedure.query(async ({ ctx }) => {
    const agregado = await ctx.prisma.pedido.aggregate({
      where: { lojaId: ctx.lojaId, criadoPorId: ctx.usuario.id, status: { not: "CANCELADO" } },
      _sum: { valorTotal: true },
      _count: true,
    });
    return {
      quantidade: agregado._count,
      valorTotal: Number(agregado._sum.valorTotal ?? 0),
    };
  }),
});
