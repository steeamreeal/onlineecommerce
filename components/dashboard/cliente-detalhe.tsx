import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PedidoStatusBadge } from "@/components/dashboard/pedido-status-badge";
import { resumoComprasCliente, type Cliente } from "@/lib/mocks/clientes";
import { pedidosMock } from "@/lib/mocks/pedidos";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ClienteDetalhe({ cliente }: { cliente: Cliente }) {
  const resumo = resumoComprasCliente(cliente.id);
  const pedidosDoCliente = pedidosMock
    .filter((p) => p.clienteId === cliente.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/painel/clientes" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <p className="text-muted-foreground text-sm">
            Cliente desde {formatoData.format(new Date(cliente.createdAt))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Total gasto</p>
          <p className="text-xl font-semibold">{formatoMoeda.format(resumo.totalGasto)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Pedidos</p>
          <p className="text-xl font-semibold">{resumo.totalPedidos}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Ticket médio</p>
          <p className="text-xl font-semibold">{formatoMoeda.format(resumo.ticketMedio)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Última compra</p>
          <p className="text-xl font-semibold">
            {resumo.ultimaCompra ? formatoData.format(new Date(resumo.ultimaCompra)) : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Histórico de compras</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosDoCliente.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>
                    <Link href={`/painel/pedidos/${pedido.id}`} className="font-medium hover:underline">
                      #{pedido.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatoData.format(new Date(pedido.createdAt))}
                  </TableCell>
                  <TableCell>
                    <PedidoStatusBadge status={pedido.status} />
                  </TableCell>
                  <TableCell className="text-right">{formatoMoeda.format(pedido.valorTotal)}</TableCell>
                </TableRow>
              ))}
              {pedidosDoCliente.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                    Nenhuma compra ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Contato</h2>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{cliente.telefone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail</span>
                <span>{cliente.email ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF/CNPJ</span>
                <span>{cliente.documento ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Endereços</h2>
            {cliente.enderecos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum endereço cadastrado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {cliente.enderecos.map((endereco) => (
                  <div key={endereco.id} className="text-sm">
                    <p>
                      {endereco.rua}
                      {endereco.numero && `, ${endereco.numero}`}
                      {endereco.bairro && ` - ${endereco.bairro}`}
                    </p>
                    <p className="text-muted-foreground">
                      {endereco.cidade}/{endereco.estado} — {endereco.cep}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
