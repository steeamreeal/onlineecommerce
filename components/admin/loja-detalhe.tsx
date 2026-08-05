"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LojaStatusBadge } from "@/components/admin/loja-status-badge";
import { EditarLojaDialog } from "@/components/admin/editar-loja-dialog";
import { ConvidarAdminLojaDialog } from "@/components/admin/convidar-admin-loja-dialog";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function LojaDetalhe({ lojaId }: { lojaId: string }) {
  const utils = trpc.useUtils();
  const [editarAberto, setEditarAberto] = useState(false);
  const [convidarAberto, setConvidarAberto] = useState(false);
  const { data: loja, isLoading } = trpc.admin.obterLoja.useQuery({ id: lojaId });

  const bloquear = trpc.admin.bloquearLoja.useMutation({
    onSuccess: () => {
      utils.admin.obterLoja.invalidate({ id: lojaId });
      toast.success(`${loja?.nome} foi bloqueada.`);
    },
    onError: () => toast.error("Não foi possível bloquear a loja."),
  });
  const liberar = trpc.admin.liberarLoja.useMutation({
    onSuccess: () => {
      utils.admin.obterLoja.invalidate({ id: lojaId });
      toast.success(`${loja?.nome} foi liberada.`);
    },
    onError: () => toast.error("Não foi possível liberar a loja."),
  });

  if (isLoading || !loja) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const bloqueada = loja.statusPlano === "BLOQUEADO";

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
            <LojaStatusBadge status={loja.statusPlano} />
          </div>
          <p className="text-muted-foreground text-sm">/{loja.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditarAberto(true)}>
            <Pencil className="size-4" />
            Editar dados
          </Button>
          <Button
            variant={bloqueada ? "default" : "destructive"}
            disabled={bloquear.isPending || liberar.isPending}
            onClick={() =>
              bloqueada ? liberar.mutate({ id: loja.id }) : bloquear.mutate({ id: loja.id })
            }
          >
            {bloqueada ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
            {bloqueada ? "Liberar loja" : "Bloquear loja"}
          </Button>
        </div>
      </div>

      <EditarLojaDialog
        open={editarAberto}
        onOpenChange={setEditarAberto}
        loja={{
          id: loja.id,
          nome: loja.nome,
          slug: loja.slug,
          responsavel: loja.responsavel,
          emailContato: loja.emailContato,
          planoId: loja.planoId,
        }}
      />
      <ConvidarAdminLojaDialog
        open={convidarAberto}
        onOpenChange={setConvidarAberto}
        lojaId={loja.id}
        emailSugerido={loja.emailContato}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-medium">Responsável</h2>
            <Button variant="ghost" size="sm" onClick={() => setConvidarAberto(true)}>
              <UserPlus className="size-4" />
              Convidar acesso
            </Button>
          </div>
          <p className="font-medium">{loja.responsavel ?? "Não informado"}</p>
          <p className="text-muted-foreground text-sm">{loja.emailContato ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Plano</h2>
          <p className="font-medium">{loja.plano?.nome ?? "Sem plano"}</p>
          <p className="text-muted-foreground text-sm">
            Cliente desde {formatoData.format(new Date(loja.createdAt))}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Faturamento</h2>
          <p className="font-medium">{formatoMoeda.format(loja.faturamentoTotal)}</p>
          <p className="text-muted-foreground text-sm">{loja.numeroPedidos} pedidos</p>
        </div>
      </div>
    </div>
  );
}
