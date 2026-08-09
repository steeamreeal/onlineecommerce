"use client";

import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function BadgeStatus({ status }: { status: "PENDENTE" | "APROVADA" | "REJEITADA" }) {
  if (status === "APROVADA") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Aprovada</Badge>;
  if (status === "REJEITADA") return <Badge variant="destructive">Rejeitada</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

export function AprovacoesLista() {
  const utils = trpc.useUtils();

  // listarPendentes só funciona para Dono/Gerente (roleProcedure) — quem não
  // tem permissão simplesmente não vê essa seção, sem toast de erro, já que
  // é esperado para Vendedor/Estoquista/Separador abrirem esta tela.
  const pendentes = trpc.aprovacoes.listarPendentes.useQuery(undefined, { retry: false });
  const minhas = trpc.aprovacoes.minhasSolicitacoes.useQuery();

  const aprovar = trpc.aprovacoes.aprovar.useMutation({
    onSuccess: () => {
      utils.aprovacoes.listarPendentes.invalidate();
      utils.aprovacoes.minhasSolicitacoes.invalidate();
    },
  });
  const rejeitar = trpc.aprovacoes.rejeitar.useMutation({
    onSuccess: () => {
      utils.aprovacoes.listarPendentes.invalidate();
      utils.aprovacoes.minhasSolicitacoes.invalidate();
    },
  });

  async function handleAprovar(id: string) {
    try {
      await aprovar.mutateAsync({ id });
      toast.success("Solicitação aprovada e aplicada.");
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível aprovar a solicitação.";
      toast.error(mensagem);
    }
  }

  async function handleRejeitar(id: string) {
    const motivo = window.prompt("Motivo da rejeição (opcional):") ?? undefined;
    try {
      await rejeitar.mutateAsync({ id, motivo: motivo || undefined });
      toast.success("Solicitação rejeitada.");
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível rejeitar a solicitação.";
      toast.error(mensagem);
    }
  }

  const mostrarFilaAprovacao = !pendentes.isError;

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Aprovações</h1>
        <p className="text-muted-foreground text-sm">
          Mudanças feitas por Vendedor, Estoquista e Separador ficam pendentes aqui até um Dono ou
          Gerente aprovar.
        </p>
      </div>

      {mostrarFilaAprovacao && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Pendentes de aprovação</h2>

          {pendentes.isLoading && <Skeleton className="h-32 w-full" />}

          {!pendentes.isLoading && (pendentes.data?.length ?? 0) === 0 && (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              Nenhuma solicitação pendente no momento.
            </div>
          )}

          {!pendentes.isLoading && (pendentes.data?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-3">
              {pendentes.data!.map((solicitacao) => (
                <div
                  key={solicitacao.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">{solicitacao.resumo}</div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      Solicitado por {solicitacao.solicitante.nome} em{" "}
                      {formatoData.format(new Date(solicitacao.createdAt))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejeitar(solicitacao.id)}
                      disabled={aprovar.isPending || rejeitar.isPending}
                    >
                      <XCircle className="size-4" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAprovar(solicitacao.id)}
                      disabled={aprovar.isPending || rejeitar.isPending}
                    >
                      <CheckCircle2 className="size-4" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Minhas solicitações</h2>

        {minhas.isLoading && <Skeleton className="h-32 w-full" />}

        {!minhas.isLoading && (minhas.data?.length ?? 0) === 0 && (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            Você ainda não fez nenhuma solicitação.
          </div>
        )}

        {!minhas.isLoading && (minhas.data?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-3">
            {minhas.data!.map((solicitacao) => (
              <div key={solicitacao.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{solicitacao.resumo}</span>
                  <BadgeStatus status={solicitacao.status} />
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {formatoData.format(new Date(solicitacao.createdAt))}
                  {solicitacao.revisor && ` · revisado por ${solicitacao.revisor.nome}`}
                </div>
                {solicitacao.status === "REJEITADA" && solicitacao.erro && (
                  <div className="mt-2 text-sm text-destructive">Motivo: {solicitacao.erro}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
