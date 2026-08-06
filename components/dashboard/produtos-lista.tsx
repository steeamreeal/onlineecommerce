"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ProdutoStatusBadge } from "@/components/dashboard/produto-status-badge";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ESTOQUE_BAIXO_LIMITE } from "@/lib/estoque";
import type { StatusProduto } from "@prisma/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const TODOS = "TODOS";

const statusSelectItems = [
  { value: TODOS, label: "Todos os status" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "DESTAQUE", label: "Destaque" },
];

export function ProdutosLista() {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>(TODOS);
  const [status, setStatus] = useState<StatusProduto | typeof TODOS>(TODOS);

  const { data: categorias = [] } = trpc.categorias.listar.useQuery();
  const { data: produtos = [], isLoading } = trpc.produtos.listar.useQuery({
    busca: busca.trim() || undefined,
    categoriaId: categoriaId === TODOS ? undefined : categoriaId,
    status: status === TODOS ? undefined : status,
  });

  const categoriaSelectItems = [
    { value: TODOS, label: "Todas as categorias" },
    ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre e gerencie os produtos da sua loja.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/painel/produtos/estoque" />}
          >
            <Boxes className="size-4" />
            Estoque
          </Button>
          <Button nativeButton={false} render={<Link href="/painel/produtos/novo" />}>
            <Plus className="size-4" />
            Novo produto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código"
            className="pl-9"
          />
        </div>
        <Select
          items={categoriaSelectItems}
          value={categoriaId}
          onValueChange={(v) => setCategoriaId(v ?? TODOS)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as categorias</SelectItem>
            {categorias.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={statusSelectItems}
          value={status}
          onValueChange={(value) => setStatus((value ?? TODOS) as StatusProduto | typeof TODOS)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
            <SelectItem value="DESTAQUE">Destaque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
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
              produtos.map((produto) => {
                const precoNormal = Number(produto.precoNormal);
                const precoPromo = produto.precoPromo != null ? Number(produto.precoPromo) : null;
                const total = produto.variacoes.reduce((soma, v) => soma + v.estoque, 0);
                const baixo = total <= ESTOQUE_BAIXO_LIMITE;
                const foto = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
                return (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
                          <img
                            src={foto.url}
                            alt={produto.nome}
                            className="bg-muted size-10 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="bg-muted size-10 shrink-0 rounded-md" />
                        )}
                        <div>
                          <div className="font-medium">{produto.nome}</div>
                          {produto.codigo && (
                            <div className="text-muted-foreground text-xs">
                              {produto.codigo}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{produto.categoria?.nome ?? "Sem categoria"}</TableCell>
                    <TableCell>
                      {precoPromo ? (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs line-through">
                            {formatoMoeda.format(precoNormal)}
                          </span>
                          <span className="font-medium">{formatoMoeda.format(precoPromo)}</span>
                        </div>
                      ) : (
                        formatoMoeda.format(precoNormal)
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(baixo && "text-warning font-medium")}>
                        {total} un.
                      </span>
                    </TableCell>
                    <TableCell>
                      <ProdutoStatusBadge status={produto.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/painel/produtos/${produto.id}/editar`} />}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            {!isLoading && produtos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
