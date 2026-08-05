"use client";

import { AlertTriangle } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AjustarEstoqueDialog } from "@/components/dashboard/ajustar-estoque-dialog";
import { ImportarEstoqueDialog } from "@/components/dashboard/importar-estoque-dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { ESTOQUE_BAIXO_LIMITE, variacaoLabel } from "@/lib/estoque";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function EstoqueTabs() {
  const utils = trpc.useUtils();
  const { data: variacoes = [], isLoading: carregandoVariacoes } =
    trpc.estoque.listarVariacoes.useQuery();
  const { data: movimentos = [], isLoading: carregandoMovimentos } =
    trpc.estoque.listarMovimentos.useQuery();

  function aoRegistrar() {
    utils.estoque.listarVariacoes.invalidate();
    utils.estoque.listarMovimentos.invalidate();
    utils.produtos.listar.invalidate();
  }

  return (
    <Tabs defaultValue="por-variacao" className="flex-1">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="por-variacao">Estoque por variação</TabsTrigger>
          <TabsTrigger value="historico">Histórico de movimentações</TabsTrigger>
        </TabsList>
        <ImportarEstoqueDialog onImportado={aoRegistrar} />
      </div>

      <TabsContent value="por-variacao">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregandoVariacoes && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!carregandoVariacoes &&
                variacoes.map((variacao) => {
                  const baixo = variacao.estoque <= ESTOQUE_BAIXO_LIMITE;
                  const label = variacaoLabel(variacao);
                  return (
                    <TableRow key={variacao.id}>
                      <TableCell className="font-medium">{variacao.produto.nome}</TableCell>
                      <TableCell>{label}</TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            baixo && "text-warning font-medium",
                          )}
                        >
                          {baixo && <AlertTriangle className="size-3.5" />}
                          {variacao.estoque} un.
                          {variacao.estoque === 0 && (
                            <span className="text-destructive text-xs">(esgotado)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AjustarEstoqueDialog
                          variacaoId={variacao.id}
                          produtoNome={variacao.produto.nome}
                          variacaoLabel={label}
                          onRegistrado={aoRegistrar}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!carregandoVariacoes && variacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                    Nenhuma variação cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="historico">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregandoMovimentos && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!carregandoMovimentos &&
                movimentos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-muted-foreground">
                      {formatoData.format(new Date(mov.createdAt))}
                    </TableCell>
                    <TableCell className="font-medium">{mov.variacao.produto.nome}</TableCell>
                    <TableCell>{variacaoLabel(mov.variacao)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          mov.tipo === "ENTRADA" ? "text-success" : "text-destructive",
                          "font-medium",
                        )}
                      >
                        {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                      </span>
                    </TableCell>
                    <TableCell>{mov.quantidade} un.</TableCell>
                    <TableCell className="text-muted-foreground">
                      {mov.motivo ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              {!carregandoMovimentos && movimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
