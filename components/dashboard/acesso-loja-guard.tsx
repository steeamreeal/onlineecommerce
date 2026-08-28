"use client";

import Link from "next/link";
import { StoreIcon, TriangleAlertIcon } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  // (ex.: conta criada pelo /cadastro sem terminar o onboarding, convite
  // ainda não aceito, ou acesso removido de todas as lojas). Antes disso
  // deixar cada tela do painel presa em loading eterno, tentando de novo sem
  // nunca mostrar o motivo real - agora oferece direto o caminho para criar
  // uma loja (ver app/(auth)/onboarding, onboarding.criarLoja).
  const semLoja =
    error instanceof TRPCClientError && error.data?.code === "BAD_REQUEST";

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

  if (semLoja) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <StoreIcon className="text-muted-foreground size-8" />
            <CardTitle>Você ainda não tem uma loja</CardTitle>
            <CardDescription>
              Sua conta não está vinculada a nenhuma loja. Crie a sua agora, ou peça para quem já
              tem uma loja te convidar como membro da equipe dela.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button nativeButton={false} render={<Link href="/onboarding" />}>
              Criar minha loja
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
