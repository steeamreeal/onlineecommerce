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
import { clientesMock, enderecoPrincipal, resumoComprasCliente } from "@/lib/mocks/clientes";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ClientesLista() {
  const [busca, setBusca] = useState("");

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo.length === 0) return clientesMock;
    return clientesMock.filter(
      (cliente) =>
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.email?.toLowerCase().includes(termo) ||
        cliente.telefone?.includes(termo),
    );
  }, [busca]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-muted-foreground text-sm">
          Consulte o cadastro e o histórico de compras dos seus clientes.
        </p>
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
            {clientesFiltrados.map((cliente) => {
              const resumo = resumoComprasCliente(cliente.id);
              const endereco = enderecoPrincipal(cliente);
              return (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <Link
                      href={`/painel/clientes/${cliente.id}`}
                      className="font-medium hover:underline"
                    >
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
                  <TableCell>{formatoMoeda.format(resumo.totalGasto)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {resumo.ultimaCompra
                      ? formatoData.format(new Date(resumo.ultimaCompra))
                      : "Nunca comprou"}
                  </TableCell>
                </TableRow>
              );
            })}
            {clientesFiltrados.length === 0 && (
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
