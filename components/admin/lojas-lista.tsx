"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LojaStatusBadge } from "@/components/admin/loja-status-badge";
import { lojasMock, type Loja, type StatusLoja } from "@/lib/mocks/lojas";
import { planoNome } from "@/lib/mocks/planos";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TODOS = "TODOS";

const statusSelectItems = [
  { value: TODOS, label: "Todos os status" },
  { value: "ATIVA", label: "Ativa" },
  { value: "TESTE", label: "Teste" },
  { value: "BLOQUEADA", label: "Bloqueada" },
];

export function LojasLista() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusLoja | typeof TODOS>(TODOS);

  const lojasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lojasMock.filter((loja: Loja) => {
      const bateBusca =
        termo.length === 0 ||
        loja.nome.toLowerCase().includes(termo) ||
        loja.responsavel.toLowerCase().includes(termo) ||
        loja.email.toLowerCase().includes(termo);
      const bateStatus = status === TODOS || loja.status === status;
      return bateBusca && bateStatus;
    });
  }, [busca, status]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Lojas</h1>
        <p className="text-muted-foreground text-sm">
          Todas as lojas cadastradas na plataforma.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, responsável ou e-mail"
            className="pl-9"
          />
        </div>
        <Select
          items={statusSelectItems}
          value={status}
          onValueChange={(v) => setStatus((v ?? TODOS) as StatusLoja | typeof TODOS)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusSelectItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loja</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Faturamento (mês)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lojasFiltradas.map((loja) => (
              <TableRow key={loja.id}>
                <TableCell>
                  <div className="font-medium">{loja.nome}</div>
                  <div className="text-muted-foreground text-xs">{loja.responsavel}</div>
                </TableCell>
                <TableCell>{planoNome(loja.planoId)}</TableCell>
                <TableCell>{formatoMoeda.format(loja.faturamentoMes)}</TableCell>
                <TableCell>
                  <LojaStatusBadge status={loja.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatoData.format(new Date(loja.createdAt))}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/admin/lojas/${loja.id}`} />}
                  >
                    Ver detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {lojasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  Nenhuma loja encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
