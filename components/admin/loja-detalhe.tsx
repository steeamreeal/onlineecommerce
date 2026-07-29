"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LojaStatusBadge } from "@/components/admin/loja-status-badge";
import type { Loja } from "@/lib/mocks/lojas";
import { planoNome } from "@/lib/mocks/planos";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function LojaDetalhe({ loja: lojaInicial }: { loja: Loja }) {
  const [loja, setLoja] = useState(lojaInicial);
  const bloqueada = loja.status === "BLOQUEADA";

  function alternarBloqueio() {
    // Mock: sem persistência real ainda (chega no M14, backend do painel admin)
    const novoStatus = bloqueada ? "ATIVA" : "BLOQUEADA";
    setLoja((atual) => ({ ...atual, status: novoStatus }));
    toast.success(
      bloqueada ? `${loja.nome} foi liberada.` : `${loja.nome} foi bloqueada.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin/lojas" />}>
          <ArrowLeft className="size-4" />
          Voltar para lojas
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{loja.nome}</h1>
            <LojaStatusBadge status={loja.status} />
          </div>
          <p className="text-muted-foreground text-sm">/{loja.slug}</p>
        </div>
        <Button
          variant={bloqueada ? "default" : "destructive"}
          onClick={alternarBloqueio}
        >
          {bloqueada ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
          {bloqueada ? "Liberar loja" : "Bloquear loja"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Responsável</h2>
          <p className="font-medium">{loja.responsavel}</p>
          <p className="text-muted-foreground text-sm">{loja.email}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Plano</h2>
          <p className="font-medium">{planoNome(loja.planoId)}</p>
          <p className="text-muted-foreground text-sm">
            Cliente desde {formatoData.format(new Date(loja.createdAt))}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Faturamento (mês)</h2>
          <p className="font-medium">{formatoMoeda.format(loja.faturamentoMes)}</p>
          <p className="text-muted-foreground text-sm">{loja.numeroPedidosMes} pedidos</p>
        </div>
      </div>
    </div>
  );
}
