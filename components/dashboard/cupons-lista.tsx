"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CupomStatusBadge } from "@/components/dashboard/cupom-status-badge";
import { CupomFormDialog } from "@/components/dashboard/cupom-form-dialog";
import { TIPO_CUPOM_LABEL } from "@/lib/cupons";
import { trpc } from "@/lib/trpc/client";
import type { Cupom } from "@prisma/client";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function valorCupom(cupom: Cupom): string {
  if (cupom.tipo === "PERCENTUAL") return `${cupom.valor}%`;
  if (cupom.tipo === "VALOR_FIXO")
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      Number(cupom.valor ?? 0),
    );
  return "—";
}

export function CuponsLista() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const utils = trpc.useUtils();

  const { data: cupons = [], isLoading } = trpc.cupons.listar.useQuery();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cupons e promoções</h1>
          <p className="text-muted-foreground text-sm">
            Crie cupons de desconto percentual, valor fixo ou frete grátis.
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Novo cupom
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Status</TableHead>
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
              cupons.map((cupom) => (
                <TableRow key={cupom.id}>
                  <TableCell className="font-medium">{cupom.codigo}</TableCell>
                  <TableCell>{TIPO_CUPOM_LABEL[cupom.tipo]}</TableCell>
                  <TableCell>{valorCupom(cupom)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatoData.format(new Date(cupom.inicio))} –{" "}
                    {formatoData.format(new Date(cupom.fim))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cupom.usosAtuais}
                    {cupom.limiteUso != null ? ` / ${cupom.limiteUso}` : ""}
                  </TableCell>
                  <TableCell>
                    <CupomStatusBadge cupom={cupom} />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && cupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  Nenhum cupom cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CupomFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onCriado={() => utils.cupons.listar.invalidate()}
      />
    </div>
  );
}
