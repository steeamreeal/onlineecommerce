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
import { AjustarEstoqueDialog } from "@/components/dashboard/ajustar-estoque-dialog";
import { cn } from "@/lib/utils";
import {
  ESTOQUE_BAIXO_LIMITE,
  movimentosEstoqueMock,
  produtosMock,
  variacaoLabel,
} from "@/lib/mocks/produtos";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function EstoqueTabs() {
  const linhasEstoque = produtosMock.flatMap((produto) =>
    produto.variacoes.map((variacao) => ({
      produtoNome: produto.nome,
      label: variacaoLabel(variacao),
      estoque: variacao.estoque,
    })),
  );

  return (
    <Tabs defaultValue="por-variacao" className="flex-1">
      <TabsList>
        <TabsTrigger value="por-variacao">Estoque por variação</TabsTrigger>
        <TabsTrigger value="historico">Histórico de movimentações</TabsTrigger>
      </TabsList>

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
              {linhasEstoque.map((linha, i) => {
                const baixo = linha.estoque <= ESTOQUE_BAIXO_LIMITE;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{linha.produtoNome}</TableCell>
                    <TableCell>{linha.label}</TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center gap-1.5",
                          baixo && "text-warning font-medium",
                        )}
                      >
                        {baixo && <AlertTriangle className="size-3.5" />}
                        {linha.estoque} un.
                        {linha.estoque === 0 && (
                          <span className="text-destructive text-xs">(esgotado)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AjustarEstoqueDialog
                        produtoNome={linha.produtoNome}
                        variacaoLabel={linha.label}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
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
              {[...movimentosEstoqueMock]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-muted-foreground">
                      {formatoData.format(new Date(mov.createdAt))}
                    </TableCell>
                    <TableCell className="font-medium">{mov.produtoNome}</TableCell>
                    <TableCell>{mov.variacaoLabel}</TableCell>
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
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
