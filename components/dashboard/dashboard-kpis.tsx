"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CircleDollarSign, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { VendasPorPeriodoChart } from "@/components/dashboard/vendas-por-periodo-chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function DashboardKpis() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const periodo = dataInicio || dataFim ? { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined } : undefined;

  const { data: kpisData, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery(periodo);
  const { data: maisVendidos = [], isLoading: maisVendidosLoading } =
    trpc.dashboard.produtosMaisVendidos.useQuery();
  const { data: topClientes = [], isLoading: topClientesLoading } =
    trpc.dashboard.clientesQueMaisCompram.useQuery();
  const { data: vendas = [], isLoading: vendasLoading } = trpc.dashboard.vendasPorDia.useQuery();

  const kpis = [
    {
      label: "Vendas pagas",
      valor: formatoMoeda.format(kpisData?.vendasPagas ?? 0),
      sub: `${kpisData?.numeroVendasPagas ?? 0} pedido(s)`,
      icon: CircleDollarSign,
    },
    {
      label: "Faturamento",
      valor: formatoMoeda.format(kpisData?.faturamentoTotal ?? 0),
      icon: TrendingUp,
    },
    { label: "Pedidos", valor: String(kpisData?.numeroPedidos ?? 0), icon: ShoppingCart },
    {
      label: "Ticket médio",
      valor: formatoMoeda.format(kpisData?.ticketMedio ?? 0),
      icon: Users,
    },
    { label: "Pedidos pendentes", valor: String(kpisData?.pedidosPendentes ?? 0), icon: Package },
  ];

  const estoqueBaixo = kpisData?.produtosEstoqueBaixo ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do desempenho da sua loja.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-36" />
          </div>
          {(dataInicio || dataFim) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>

      {kpisLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {kpis.map(({ label, valor, sub, icon: Icon }) => (
            <div key={label} className="rounded-lg border p-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Icon className="size-4" />
                {label}
              </div>
              <p className="mt-1 text-2xl font-semibold">{valor}</p>
              {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {!kpisLoading && estoqueBaixo > 0 && (
        <Link
          href="/painel/produtos/estoque"
          className="border-warning/40 bg-warning/10 text-warning-foreground flex items-center gap-2 rounded-lg border p-3 text-sm hover:opacity-90"
        >
          <AlertTriangle className="text-warning size-4 shrink-0" />
          {estoqueBaixo} produto(s) com estoque baixo. Veja o controle de estoque.
        </Link>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Vendas por período (14 dias)</h2>
          {vendasLoading ? <Skeleton className="h-40 w-full" /> : <VendasPorPeriodoChart dados={vendas} />}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Produtos mais vendidos</h2>
            {maisVendidosLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : maisVendidos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma venda ainda.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {maisVendidos.map((produto, i) => (
                  <li key={produto.nome} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                      {produto.nome}
                    </span>
                    <span className="text-muted-foreground">{produto.quantidade} un.</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Clientes que mais compram</h2>
            {topClientesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : topClientes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum cliente ainda.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {topClientes.map((cliente, i) => (
                  <li key={cliente.id} className="flex items-center justify-between">
                    <Link
                      href={`/painel/clientes/${cliente.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="text-muted-foreground w-4 text-xs">{i + 1}.</span>
                      {cliente.nome}
                    </Link>
                    <span className="text-muted-foreground">{formatoMoeda.format(cliente.totalGasto)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
