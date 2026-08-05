"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { LojaStatusBadge } from "@/components/admin/loja-status-badge";
import { CriarLojaDialog } from "@/components/admin/criar-loja-dialog";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TODOS = "TODOS";
type StatusLoja = "ATIVO" | "BLOQUEADO" | "CANCELADO" | "TESTE";

const statusSelectItems = [
  { value: TODOS, label: "Todos os status" },
  { value: "ATIVO", label: "Ativa" },
  { value: "TESTE", label: "Teste" },
  { value: "BLOQUEADO", label: "Bloqueada" },
  { value: "CANCELADO", label: "Cancelada" },
];

export function LojasLista() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusLoja | typeof TODOS>(TODOS);
  const [dialogAberto, setDialogAberto] = useState(false);

  const { data: lojas, isLoading } = trpc.admin.listarLojas.useQuery({
    busca: busca.trim() || undefined,
    status: status === TODOS ? undefined : status,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lojas</h1>
          <p className="text-muted-foreground text-sm">
            Todas as lojas cadastradas na plataforma.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Nova loja
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
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
              <TableHead>Faturamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              lojas?.map((loja) => (
                <TableRow key={loja.id}>
                  <TableCell>
                    <div className="font-medium">{loja.nome}</div>
                    <div className="text-muted-foreground text-xs">{loja.responsavel}</div>
                  </TableCell>
                  <TableCell>{loja.plano?.nome ?? "Sem plano"}</TableCell>
                  <TableCell>{formatoMoeda.format(loja.faturamentoTotal)}</TableCell>
                  <TableCell>
                    <LojaStatusBadge status={loja.statusPlano} />
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
            {!isLoading && lojas?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  Nenhuma loja encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CriarLojaDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
