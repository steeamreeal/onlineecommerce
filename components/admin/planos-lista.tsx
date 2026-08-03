"use client";

import { Check } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PlanosLista() {
  const { data: planos, isLoading } = trpc.admin.listarPlanos.useQuery();

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
      <div>
        <h1 className="text-2xl font-semibold">Planos e assinaturas</h1>
        <p className="text-muted-foreground text-sm">
          Planos disponíveis na plataforma e seus limites.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div key={plano.id} className="flex flex-col gap-4 rounded-lg border p-5">
            <div>
              <h2 className="text-lg font-semibold">{plano.nome}</h2>
              <p className="text-2xl font-semibold">
                {formatoMoeda.format(Number(plano.precoMensal))}
                <span className="text-muted-foreground text-sm font-normal">/mês</span>
              </p>
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
    </div>
  );
}
