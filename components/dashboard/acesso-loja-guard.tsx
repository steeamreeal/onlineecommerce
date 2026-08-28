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

  // BAD_REQUEST aqui só acontece quando o login não tem nenhuma UsuarioLoja
  // (ex.: conta criada pelo /cadastro sem terminar o onboarding, ou acesso
  // removido de todas as lojas) - sem isso, cada tela do painel ficava presa
  // em loading eterno, tentando de novo sem nunca mostrar o motivo real.
  const semLoja =
    error instanceof TRPCClientError && error.data?.code === "BAD_REQUEST";

  if (bloqueado || semLoja) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <TriangleAlertIcon />
          <AlertTitle>{bloqueado ? "Acesso bloqueado" : "Nenhuma loja vinculada"}</AlertTitle>
          <AlertDescription>
            {bloqueado
              ? error.message
              : "Sua conta ainda não está vinculada a nenhuma loja. Fale com quem administra a plataforma para receber um convite."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
