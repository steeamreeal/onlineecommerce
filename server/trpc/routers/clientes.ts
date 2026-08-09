import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { router, storeProcedure, roleProcedure } from "../trpc";
import { executarComAprovacao } from "../aprovacao";

// Lista/detalhe de clientes (com total gasto) é dado sensível — só Dono e
// Gerente. Exportar/importar em massa é ainda mais sensível (leva dado da
// base inteira pra fora / altera em massa) — restrito só ao Dono.
const clientesProcedure = roleProcedure(["DONO", "GERENTE"]);
const donoProcedure = roleProcedure(["DONO"]);

const enderecoSchema = z.object({
  id: z.string().optional(),
  rua: z.string().min(1),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().min(1),
  estado: z.string().min(1),
  cep: z.string().min(1),
  principal: z.boolean().default(false),
});

const clienteInputBase = {
  nome: z.string().min(1),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  documento: z.string().optional(),
  enderecos: z.array(enderecoSchema).default([]),
  totalGastoAnterior: z.number().nonnegative().optional(),
  ultimaCompraAnterior: z.coerce.date().optional(),
};

export const clienteCriarSchema = z.object(clienteInputBase);
export const clienteAtualizarSchema = z.object({ id: z.string(), ...clienteInputBase });
export const clienteRemoverSchema = z.object({ id: z.string() });

export async function executarClienteCriar(
  ctx: { prisma: Prisma.TransactionClient | import("@prisma/client").PrismaClient; lojaId: string },
  input: {
    nome: string;
    telefone?: string;
    email?: string;
    documento?: string;
    enderecos: {
      id?: string;
      rua: string;
      numero?: string;
      bairro?: string;
      cidade: string;
      estado: string;
      cep: string;
      principal: boolean;
    }[];
    totalGastoAnterior?: number;
    ultimaCompraAnterior?: Date;
  },
) {
  return ctx.prisma.cliente.create({
    data: {
      lojaId: ctx.lojaId,
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      documento: input.documento,
      totalGastoAnterior: input.totalGastoAnterior,
      ultimaCompraAnterior: input.ultimaCompraAnterior,
      enderecos: {
        create: input.enderecos.map(({ rua, numero, bairro, cidade, estado, cep, principal }) => ({
          rua,
          numero,
          bairro,
          cidade,
          estado,
          cep,
          principal,
        })),
      },
    },
    include: { enderecos: true },
  });
}

export async function executarClienteAtualizar(
  ctx: { prisma: import("@prisma/client").PrismaClient; lojaId: string },
  input: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
    documento?: string;
    enderecos: {
      id?: string;
      rua: string;
      numero?: string;
      bairro?: string;
      cidade: string;
      estado: string;
      cep: string;
      principal: boolean;
    }[];
    totalGastoAnterior?: number;
    ultimaCompraAnterior?: Date;
  },
) {
  const clienteExistente = await ctx.prisma.cliente.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
    include: { enderecos: true },
  });
  if (!clienteExistente) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
  }

  const idsEnderecosExistentes = new Set(clienteExistente.enderecos.map((e) => e.id));
  const enderecosParaManter = input.enderecos.filter(
    (e) => e.id && idsEnderecosExistentes.has(e.id),
  );
  const idsEnderecosParaManter = new Set(enderecosParaManter.map((e) => e.id));
  const enderecosParaRemover = clienteExistente.enderecos.filter(
    (e) => !idsEnderecosParaManter.has(e.id),
  );
  const enderecosParaCriar = input.enderecos.filter(
    (e) => !e.id || !idsEnderecosExistentes.has(e.id),
  );

  return ctx.prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: { id: input.id },
      data: {
        nome: input.nome,
        telefone: input.telefone,
        email: input.email,
        documento: input.documento,
        totalGastoAnterior: input.totalGastoAnterior,
        ultimaCompraAnterior: input.ultimaCompraAnterior,
      },
    });

    if (enderecosParaRemover.length > 0) {
      await tx.enderecoCliente.deleteMany({
        where: { id: { in: enderecosParaRemover.map((e) => e.id) }, clienteId: input.id },
      });
    }
    for (const endereco of enderecosParaManter) {
      await tx.enderecoCliente.updateMany({
        where: { id: endereco.id, clienteId: input.id },
        data: {
          rua: endereco.rua,
          numero: endereco.numero,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          cep: endereco.cep,
          principal: endereco.principal,
        },
      });
    }
    if (enderecosParaCriar.length > 0) {
      await tx.enderecoCliente.createMany({
        data: enderecosParaCriar.map(({ rua, numero, bairro, cidade, estado, cep, principal }) => ({
          clienteId: input.id,
          rua,
          numero,
          bairro,
          cidade,
          estado,
          cep,
          principal,
        })),
      });
    }

    return tx.cliente.findUniqueOrThrow({
      where: { id: input.id },
      include: { enderecos: true },
    });
  });
}

export async function executarClienteRemover(
  ctx: { prisma: import("@prisma/client").PrismaClient; lojaId: string },
  input: { id: string },
) {
  const cliente = await ctx.prisma.cliente.findFirst({
    where: { id: input.id, lojaId: ctx.lojaId },
  });
  if (!cliente) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
  }
  const pedidosDoCliente = await ctx.prisma.pedido.count({ where: { clienteId: input.id } });
  if (pedidosDoCliente > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Não é possível remover um cliente com pedidos no histórico.",
    });
  }
  return ctx.prisma.cliente.delete({ where: { id: input.id } });
}

export const clientesRouter = router({
  listar: clientesProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      const termo = input?.busca?.trim();
      return ctx.prisma.cliente.findMany({
        where: {
          lojaId: ctx.lojaId,
          ...(termo
            ? {
                OR: [
                  { nome: { contains: termo, mode: "insensitive" } },
                  { email: { contains: termo, mode: "insensitive" } },
                  { telefone: { contains: termo, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { enderecos: true },
        orderBy: { nome: "asc" },
      });
    }),

  // Traz todos os clientes com totalGasto/ultimaCompra já calculados, para
  // exportação em CSV — evita repetir a query N+1 que resumoCompras faz
  // por cliente (chamada uma vez por linha na tabela do painel).
  exportar: donoProcedure.query(async ({ ctx }) => {
    const clientes = await ctx.prisma.cliente.findMany({
      where: { lojaId: ctx.lojaId },
      include: {
        enderecos: true,
        pedidos: {
          where: { status: { not: "CANCELADO" } },
          select: { valorTotal: true, createdAt: true },
        },
      },
      orderBy: { nome: "asc" },
    });

    return clientes.map((cliente) => {
      const totalGastoPedidos = cliente.pedidos.reduce((soma, p) => soma + Number(p.valorTotal), 0);
      const totalGasto = totalGastoPedidos + Number(cliente.totalGastoAnterior ?? 0);
      const datas = cliente.pedidos.map((p) => p.createdAt);
      if (cliente.ultimaCompraAnterior) datas.push(cliente.ultimaCompraAnterior);
      const ultimaCompra = datas.sort((a, b) => b.getTime() - a.getTime()).at(0);
      const enderecoPrincipal = cliente.enderecos.find((e) => e.principal) ?? cliente.enderecos[0];

      return {
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email,
        documento: cliente.documento,
        cidade: enderecoPrincipal?.cidade ?? null,
        estado: enderecoPrincipal?.estado ?? null,
        totalGasto,
        ultimaCompra,
      };
    });
  }),

  buscarPorId: clientesProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cliente = await ctx.prisma.cliente.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: {
          enderecos: true,
          pedidos: { orderBy: { createdAt: "desc" }, include: { itens: true } },
        },
      });
      if (!cliente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      }
      return cliente;
    }),

  // Total gasto, ticket médio e última compra ignoram pedidos CANCELADO,
  // igual ao comportamento do mock que este router substitui. totalGasto e
  // ultimaCompra somam/comparam com o histórico anterior ao site (informado
  // manualmente pelo lojista), mas ticketMedio considera só pedidos reais —
  // não temos a contagem de compras anteriores, só o valor agregado.
  resumoCompras: clientesProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cliente = await ctx.prisma.cliente.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        select: { totalGastoAnterior: true, ultimaCompraAnterior: true },
      });
      if (!cliente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      }

      const pedidos = await ctx.prisma.pedido.findMany({
        where: { clienteId: input.id, lojaId: ctx.lojaId, status: { not: "CANCELADO" } },
        select: { valorTotal: true, createdAt: true },
      });
      const totalPedidos = pedidos.length;
      const totalGastoPedidos = pedidos.reduce((soma, p) => soma + Number(p.valorTotal), 0);
      const ticketMedio = totalPedidos > 0 ? totalGastoPedidos / totalPedidos : 0;
      const totalGasto = totalGastoPedidos + Number(cliente.totalGastoAnterior ?? 0);

      const datas = pedidos.map((p) => p.createdAt);
      if (cliente.ultimaCompraAnterior) datas.push(cliente.ultimaCompraAnterior);
      const ultimaCompra = datas.sort((a, b) => b.getTime() - a.getTime()).at(0);

      return { totalPedidos, totalGasto, ticketMedio, ultimaCompra };
    }),

  criar: storeProcedure
    .input(clienteCriarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "CLIENTE_CRIAR", `Novo cliente: ${input.nome}`, input, () =>
        executarClienteCriar(ctx, input),
      ),
    ),

  atualizar: storeProcedure
    .input(clienteAtualizarSchema)
    .mutation(({ ctx, input }) =>
      executarComAprovacao(ctx, "CLIENTE_ATUALIZAR", `Editar cliente: ${input.nome}`, input, () =>
        executarClienteAtualizar(ctx, input),
      ),
    ),

  // Importação em massa (CSV) — pula clientes cujo telefone ou email já
  // existir na loja, para não duplicar cadastro em reimportações. Não
  // aceita endereços (fora de escopo do CSV); quem precisar de endereço
  // completa depois manualmente.
  importarVarios: donoProcedure
    .input(
      z.object({
        clientes: z
          .array(
            z.object({
              nome: z.string().min(1),
              telefone: z.string().optional(),
              email: z.string().email().optional().or(z.literal("")),
              documento: z.string().optional(),
              cidade: z.string().optional(),
              estado: z.string().optional(),
              totalGastoAnterior: z.number().nonnegative().optional(),
              ultimaCompraAnterior: z.coerce.date().optional(),
            }),
          )
          .min(1)
          .max(1000, "No máximo 1000 clientes por importação."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existentes = await ctx.prisma.cliente.findMany({
        where: { lojaId: ctx.lojaId },
        select: { telefone: true, email: true },
      });
      const telefonesExistentes = new Set(existentes.map((c) => c.telefone).filter(Boolean));
      const emailsExistentes = new Set(existentes.map((c) => c.email).filter(Boolean));

      const novos = input.clientes.filter((c) => {
        const duplicadoTelefone = c.telefone && telefonesExistentes.has(c.telefone);
        const duplicadoEmail = c.email && emailsExistentes.has(c.email);
        return !duplicadoTelefone && !duplicadoEmail;
      });

      if (novos.length === 0) {
        return { importados: 0, ignorados: input.clientes.length };
      }

      await ctx.prisma.cliente.createMany({
        data: novos.map((c) => ({
          lojaId: ctx.lojaId,
          nome: c.nome,
          telefone: c.telefone || undefined,
          email: c.email || undefined,
          documento: c.documento || undefined,
          totalGastoAnterior: c.totalGastoAnterior,
          ultimaCompraAnterior: c.ultimaCompraAnterior,
        })),
      });

      return { importados: novos.length, ignorados: input.clientes.length - novos.length };
    }),

  remover: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cliente = await ctx.prisma.cliente.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
      });
      const resumo = `Remover cliente: ${cliente?.nome ?? input.id}`;
      return executarComAprovacao(ctx, "CLIENTE_REMOVER", resumo, input, () =>
        executarClienteRemover(ctx, input),
      );
    }),
});
