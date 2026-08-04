"use client";

import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanoDialog } from "@/components/admin/plano-dialog";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PlanosLista() {
  const { data: planos, isLoading } = trpc.admin.listarPlanos.useQuery();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [planoEmEdicao, setPlanoEmEdicao] = useState<
    NonNullable<typeof planos>[number] | undefined
  >(undefined);

  function abrirNovo() {
    setPlanoEmEdicao(undefined);
    setDialogAberto(true);
  }

  function abrirEdicao(plano: NonNullable<typeof planos>[number]) {
    setPlanoEmEdicao(plano);
    setDialogAberto(true);
  }

  if (isLoading || !planos) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planos e assinaturas</h1>
          <p className="text-muted-foreground text-sm">
            Planos disponíveis na plataforma e seus limites.
          </p>
        </div>
        <Button size="sm" onClick={abrirNovo}>
          <Plus className="size-4" />
          Novo plano
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div key={plano.id} className="flex flex-col gap-4 rounded-lg border p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{plano.nome}</h2>
                <p className="text-2xl font-semibold">
                  {formatoMoeda.format(Number(plano.precoMensal))}
                  <span className="text-muted-foreground text-sm font-normal">/mês</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => abrirEdicao(plano)}>
                <Pencil className="size-4" />
              </Button>
            </div>

            <div className="text-muted-foreground text-sm">
              <p>
                {plano.limiteProdutos === null
                  ? "Produtos ilimitados"
                  : `Até ${plano.limiteProdutos} produtos`}
              </p>
              <p>
                {plano.limiteUsuarios === null
                  ? "Usuários ilimitados"
                  : `Até ${plano.limiteUsuarios} usuários`}
              </p>
              <p>
                {plano.stripePriceId ? (
                  <span className="text-success">Vinculado ao Stripe</span>
                ) : (
                  <span className="text-destructive">Sem Price ID do Stripe</span>
                )}
              </p>
            </div>

            <ul className="flex flex-col gap-2 text-sm">
              {plano.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="text-success size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground mt-auto text-sm">
              {plano._count.lojas} loja(s) neste plano
            </p>
          </div>
        ))}
      </div>

      <PlanoDialog open={dialogAberto} onOpenChange={setDialogAberto} plano={planoEmEdicao} />
    </div>
  );
}
