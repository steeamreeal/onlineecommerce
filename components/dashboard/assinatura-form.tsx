"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ATIVO: { label: "Ativo", variant: "default" },
  TESTE: { label: "Em teste", variant: "secondary" },
  BLOQUEADO: { label: "Bloqueado", variant: "destructive" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
};

export function AssinaturaForm() {
  const searchParams = useSearchParams();
  const { data: loja, isLoading: carregandoLoja } = trpc.loja.atual.useQuery();
  const { data: planos, isLoading: carregandoPlanos } = trpc.pagamentos.listarPlanos.useQuery();

  useEffect(() => {
    const mp = searchParams.get("mp");
    if (mp === "sucesso") toast.success("Mercado Pago conectado com sucesso.");
    if (mp === "erro") toast.error("Não foi possível conectar o Mercado Pago. Tente novamente.");
  }, [searchParams]);

  const criarCheckout = trpc.pagamentos.criarCheckoutAssinatura.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error("Não foi possível iniciar o checkout. Tente novamente.");
    },
  });

  const criarPortal = trpc.pagamentos.criarPortalAssinatura.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error("Não foi possível abrir o portal de assinatura.");
    },
  });

  const iniciarConexaoMercadoPago = trpc.pagamentos.iniciarConexaoMercadoPago.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível iniciar a conexão com o Mercado Pago.");
    },
  });

  if (carregandoLoja || carregandoPlanos) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const status = loja?.statusPlano ? STATUS_LABEL[loja.statusPlano] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Plano atual</CardTitle>
          <CardDescription>
            {loja?.plano ? loja.plano.nome : "Nenhum plano assinado ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
          {loja?.plano && (
            <span className="text-muted-foreground text-sm">
              {formatoMoeda.format(Number(loja.plano.precoMensal))}/mês
            </span>
          )}
        </CardContent>
        {loja?.stripeCustomerId && (
          <CardFooter className="justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={criarPortal.isPending}
              onClick={() => criarPortal.mutate()}
            >
              {criarPortal.isPending ? "Abrindo..." : "Gerenciar assinatura"}
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recebimento dos pagamentos da loja</CardTitle>
          <CardDescription>
            Conecte sua conta do Mercado Pago para receber diretamente pelos pedidos pagos por
            PIX, cartão ou boleto no site da sua loja. O dinheiro cai direto na sua conta — a
            plataforma nunca fica no meio do pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          {loja?.mpConectadoEm ? (
            <>
              <Badge>Conectado</Badge>
              <span className="text-muted-foreground text-sm">
                desde {formatoData.format(new Date(loja.mpConectadoEm))}
              </span>
            </>
          ) : (
            <Badge variant="secondary">Não conectado</Badge>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant={loja?.mpConectadoEm ? "outline" : "default"}
            disabled={iniciarConexaoMercadoPago.isPending}
            onClick={() => iniciarConexaoMercadoPago.mutate()}
          >
            {iniciarConexaoMercadoPago.isPending
              ? "Redirecionando..."
              : loja?.mpConectadoEm
                ? "Reconectar Mercado Pago"
                : "Conectar Mercado Pago"}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {planos?.map((plano) => {
          const ehPlanoAtual = plano.id === loja?.planoId;
          return (
            <Card key={plano.id}>
              <CardHeader>
                <CardTitle>{plano.nome}</CardTitle>
                <CardDescription>{formatoMoeda.format(Number(plano.precoMensal))}/mês</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-col gap-1 text-sm">
                <span>{plano.limiteProdutos ? `Até ${plano.limiteProdutos} produtos` : "Produtos ilimitados"}</span>
                <span>{plano.limiteUsuarios ? `Até ${plano.limiteUsuarios} usuários` : "Usuários ilimitados"}</span>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  type="button"
                  disabled={ehPlanoAtual || criarCheckout.isPending}
                  onClick={() => criarCheckout.mutate({ planoId: plano.id })}
                >
                  {ehPlanoAtual
                    ? "Plano atual"
                    : criarCheckout.isPending
                      ? "Redirecionando..."
                      : "Assinar"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
