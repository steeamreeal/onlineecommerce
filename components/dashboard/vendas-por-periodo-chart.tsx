"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type VendaPorDia = { data: string; valor: number };

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoDataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export function VendasPorPeriodoChart({ dados }: { dados: VendaPorDia[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="text-muted-foreground text-sm">Sem dados de vendas para o período.</p>;
  }

  const max = Math.max(...dados.map((d) => d.valor), 1);
  const ultimoComVenda = dados.reduce(
    (ultimo, dia, i) => (dia.valor > 0 ? i : ultimo),
    dados.length - 1,
  );
  const destaque = ativo ?? ultimoComVenda;
  const pontoDestaque = dados[destaque];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {formatoDataCurta.format(new Date(`${pontoDestaque.data}T00:00:00Z`))}
          </p>
          <p className="text-xl font-semibold">{formatoMoeda.format(pontoDestaque.valor)}</p>
        </div>
      </div>
      <div
        className="flex h-40 items-end gap-1"
        role="img"
        aria-label={`Vendas por dia nos últimos ${dados.length} dias`}
      >
        {dados.map((dia, i) => {
          const alturaPercentual = Math.max((dia.valor / max) * 100, dia.valor > 0 ? 4 : 2);
          const selecionado = i === destaque;
          return (
            <button
              key={dia.data}
              type="button"
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
              onMouseEnter={() => setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onBlur={() => setAtivo(null)}
              aria-label={`${formatoDataCurta.format(new Date(`${dia.data}T00:00:00Z`))}: ${formatoMoeda.format(dia.valor)}`}
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-colors",
                  selecionado ? "bg-chart-1" : "bg-chart-1/40 group-hover:bg-chart-1/70",
                )}
                style={{ height: `${alturaPercentual}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatoDataCurta.format(new Date(`${dados[0].data}T00:00:00Z`))}</span>
        <span>{formatoDataCurta.format(new Date(`${dados.at(-1)!.data}T00:00:00Z`))}</span>
      </div>
    </div>
  );
}
