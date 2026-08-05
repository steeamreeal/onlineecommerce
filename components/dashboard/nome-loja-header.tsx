"use client";

import { trpc } from "@/lib/trpc/client";

// Mesma query de AcessoLojaGuard (loja.atual) — o React Query deduplica a
// chamada de rede, então não custa uma segunda requisição.
export function NomeLojaHeader() {
  const { data: loja } = trpc.loja.atual.useQuery();
  return <span className="text-sm font-medium">{loja?.nome ?? "Painel da loja"}</span>;
}
