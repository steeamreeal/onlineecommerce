"use client";

import { BoasVindasOperacional } from "@/components/dashboard/boas-vindas-operacional";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { MinhasVendas } from "@/components/dashboard/minhas-vendas";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

// Vendedor, Estoquista e Separador não têm acesso ao dashboard financeiro da
// loja: em vez de uma tela de zeros (a API recusa), cada um vê o que é seu.
export function PainelInicio() {
  const { data, isLoading } = trpc.minhasLojas.listar.useQuery();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const papel = data?.lojas.find((loja) => loja.id === data.ativaId)?.papel;
  if (papel === "VENDEDOR") return <MinhasVendas />;
  if (papel === "ESTOQUISTA" || papel === "SEPARADOR") return <BoasVindasOperacional papel={papel} />;
  return <DashboardKpis />;
}
