"use client";

import Link from "next/link";
import { CircleDollarSign, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Painel do Vendedor: só as vendas que ele mesmo registrou. O dashboard
// financeiro da loja (faturamento, ticket médio, ranking) é restrito a
// Dono/Administrador/Gerente.
export function MinhasVendas() {
  const { data, isLoading } = trpc.pedidos.resumoMinhasVendas.useQuery();

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Minhas vendas</h1>
          <p className="text-muted-foreground text-sm">
            Pedidos que você registrou. Vendas feitas pelo site não aparecem aqui.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/painel/pedidos" />}>
          Ver meus pedidos
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pedidos registrados</CardTitle>
            <ShoppingCart className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-semibold">{data?.quantidade ?? 0}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-sm font-medium">Valor vendido</CardTitle>
            <CircleDollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-semibold">{formatoMoeda.format(data?.valorTotal ?? 0)}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
