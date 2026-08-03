"use client";

import { TriangleAlertIcon } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";

// loja.atual é a query mais leve/estável do painel — usada aqui só para
// detectar cedo se storeProcedure rejeitou a requisição por loja bloqueada
// (ver server/trpc/trpc.ts) e mostrar uma mensagem clara, em vez de deixar
// cada tela do painel presa em loading eterno quando isso acontece.
export function AcessoLojaGuard({ children }: { children: React.ReactNode }) {
  const { error } = trpc.loja.atual.useQuery();

  const bloqueado =
    error instanceof TRPCClientError && error.data?.code === "FORBIDDEN";

  if (bloqueado) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <TriangleAlertIcon />
          <AlertTitle>Acesso bloqueado</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
