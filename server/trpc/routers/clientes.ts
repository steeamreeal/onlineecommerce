import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, storeProcedure } from "../trpc";

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
};

export const clientesRouter = router({
  listar: storeProcedure
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

  buscarPorId: storeProcedure
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
  // igual ao comportamento do mock que este router substitui.
  resumoCompras: storeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pedidos = await ctx.prisma.pedido.findMany({
        where: { clienteId: input.id, lojaId: ctx.lojaId, status: { not: "CANCELADO" } },
        select: { valorTotal: true, createdAt: true },
      });
      const totalPedidos = pedidos.length;
      const totalGasto = pedidos.reduce((soma, p) => soma + Number(p.valorTotal), 0);
      const ticketMedio = totalPedidos > 0 ? totalGasto / totalPedidos : 0;
      const ultimaCompra = pedidos
        .map((p) => p.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())
        .at(0);

      return { totalPedidos, totalGasto, ticketMedio, ultimaCompra };
    }),

  criar: storeProcedure
    .input(z.object(clienteInputBase))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.cliente.create({
        data: {
          lojaId: ctx.lojaId,
          nome: input.nome,
          telefone: input.telefone,
          email: input.email,
          documento: input.documento,
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
    }),

  atualizar: storeProcedure
    .input(z.object({ id: z.string(), ...clienteInputBase }))
    .mutation(async ({ ctx, input }) => {
      const clienteExistente = await ctx.prisma.cliente.findFirst({
        where: { id: input.id, lojaId: ctx.lojaId },
        include: { enderecos: true },
      });
      if (!clienteExistente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      }

      // Mesmo cuidado de produtos.ts: só ids que já pertencem a este cliente
      // (logo, a esta loja) podem ser atualizados; qualquer outro id vira
      // criação, evitando IDOR entre tenants.
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
    }),

  remover: storeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
    }),
});
