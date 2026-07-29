import { lojasMock } from "@/lib/mocks/lojas";
import { planoPorId } from "@/lib/mocks/planos";

export function mrr(): number {
  return lojasMock
    .filter((l) => l.status !== "BLOQUEADA")
    .reduce((soma, l) => soma + (planoPorId(l.planoId)?.precoMensal ?? 0), 0);
}

export function totalLojas(): number {
  return lojasMock.length;
}

export function lojasPorStatus() {
  return {
    ATIVA: lojasMock.filter((l) => l.status === "ATIVA").length,
    BLOQUEADA: lojasMock.filter((l) => l.status === "BLOQUEADA").length,
    TESTE: lojasMock.filter((l) => l.status === "TESTE").length,
  };
}

export function faturamentoTotalPlataforma(): number {
  return lojasMock.reduce((soma, l) => soma + l.faturamentoMes, 0);
}

export function novasLojasNoMes(referencia = new Date("2026-07-29")): number {
  return lojasMock.filter((l) => {
    const criada = new Date(l.createdAt);
    return (
      criada.getUTCFullYear() === referencia.getUTCFullYear() &&
      criada.getUTCMonth() === referencia.getUTCMonth()
    );
  }).length;
}

export type LojaPorPlano = {
  planoId: string;
  planoNome: string;
  quantidade: number;
};

export function lojasPorPlano(): LojaPorPlano[] {
  const contagem = new Map<string, number>();
  for (const loja of lojasMock) {
    contagem.set(loja.planoId, (contagem.get(loja.planoId) ?? 0) + 1);
  }
  return [...contagem.entries()].map(([planoId, quantidade]) => ({
    planoId,
    planoNome: planoPorId(planoId)?.nome ?? "Sem plano",
    quantidade,
  }));
}
