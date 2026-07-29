import { Building2, DollarSign, Store, TrendingUp } from "lucide-react";

import {
  faturamentoTotalPlataforma,
  lojasPorPlano,
  lojasPorStatus,
  mrr,
  novasLojasNoMes,
  totalLojas,
} from "@/lib/mocks/metricas";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AdminDashboard() {
  const status = lojasPorStatus();
  const porPlano = lojasPorPlano();

  const kpis = [
    { label: "MRR", valor: formatoMoeda.format(mrr()), icon: DollarSign },
    { label: "Lojas cadastradas", valor: String(totalLojas()), icon: Store },
    { label: "Novas lojas no mês", valor: String(novasLojasNoMes()), icon: Building2 },
    {
      label: "Faturamento das lojas (mês)",
      valor: formatoMoeda.format(faturamentoTotalPlataforma()),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Métricas gerais</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral da plataforma e das lojas cadastradas.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="rounded-lg border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Icon className="size-4" />
              {label}
            </div>
            <p className="mt-1 text-2xl font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Lojas por status</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Ativas</span>
              <span className="text-muted-foreground">{status.ATIVA}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Em teste</span>
              <span className="text-muted-foreground">{status.TESTE}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Bloqueadas</span>
              <span className="text-muted-foreground">{status.BLOQUEADA}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Lojas por plano</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {porPlano.map((item) => (
              <li key={item.planoId} className="flex items-center justify-between">
                <span>{item.planoNome}</span>
                <span className="text-muted-foreground">{item.quantidade}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
