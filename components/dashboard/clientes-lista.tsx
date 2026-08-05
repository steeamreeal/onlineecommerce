"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { NovoClienteDialog } from "@/components/dashboard/novo-cliente-dialog";
import { ImportarClientesDialog } from "@/components/dashboard/importar-clientes-dialog";
import { ExportarClientesButton } from "@/components/dashboard/exportar-clientes-button";
import type { EnderecoCliente } from "@prisma/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function enderecoPrincipal(enderecos: EnderecoCliente[]) {
  return enderecos.find((e) => e.principal) ?? enderecos[0];
}

type ClienteComEnderecos = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  enderecos: EnderecoCliente[];
};

function LinhaCliente({ cliente }: { cliente: ClienteComEnderecos }) {
  const { data: resumo } = trpc.clientes.resumoCompras.useQuery({ id: cliente.id });
  const endereco = enderecoPrincipal(cliente.enderecos);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/painel/clientes/${cliente.id}`} className="font-medium hover:underline">
          {cliente.nome}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div>{cliente.telefone ?? "—"}</div>
        <div className="text-xs">{cliente.email ?? "—"}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {endereco ? `${endereco.cidade}/${endereco.estado}` : "—"}
      </TableCell>
      <TableCell>{formatoMoeda.format(resumo?.totalGasto ?? 0)}</TableCell>
      <TableCell className="text-muted-foreground">
        {resumo?.ultimaCompra ? formatoData.format(new Date(resumo.ultimaCompra)) : "Nunca comprou"}
      </TableCell>
    </TableRow>
  );
}

export function ClientesLista() {
  const [busca, setBusca] = useState("");
  const buscaDebounced = busca.trim() || undefined;

  const utils = trpc.useUtils();
  const { data: clientes = [], isLoading } = trpc.clientes.listar.useQuery({
    busca: buscaDebounced,
  });
  const clientesFiltrados = useMemo(() => clientes, [clientes]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Consulte o cadastro e o histórico de compras dos seus clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportarClientesButton />
          <ImportarClientesDialog onImportado={() => utils.clientes.listar.invalidate()} />
          <NovoClienteDialog onCriado={() => utils.clientes.listar.invalidate()} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Total gasto</TableHead>
              <TableHead>Última compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              clientesFiltrados.map((cliente) => <LinhaCliente key={cliente.id} cliente={cliente} />)}
            {!isLoading && clientesFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
