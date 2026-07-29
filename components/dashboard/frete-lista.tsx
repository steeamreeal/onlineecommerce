"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TIPO_FRETE_LABEL, opcoesFreteMock, type OpcaoFrete } from "@/lib/mocks/frete";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function FreteLista() {
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>(opcoesFreteMock);

  function alternarAtivo(opcao: OpcaoFrete) {
    // Mock: sem persistência real ainda (chega no M10, backend de pedidos/frete)
    setOpcoes((atual) =>
      atual.map((o) => (o.id === opcao.id ? { ...o, ativo: !o.ativo } : o)),
    );
    toast.success(`"${opcao.nome}" ${opcao.ativo ? "desativado" : "ativado"}.`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Frete e entrega</h1>
        <p className="text-muted-foreground text-sm">
          Configure as opções de frete disponíveis para os clientes da sua loja.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {opcoes.map((opcao) => (
          <div
            key={opcao.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{opcao.nome}</span>
                <span className="text-muted-foreground text-xs">
                  {TIPO_FRETE_LABEL[opcao.tipo]}
                </span>
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {opcao.valor != null
                  ? opcao.valor === 0
                    ? "Grátis"
                    : formatoMoeda.format(opcao.valor)
                  : "Valor calculado no checkout"}
                {opcao.freteGratisAcimaDe != null &&
                  ` · grátis acima de ${formatoMoeda.format(opcao.freteGratisAcimaDe)}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`ativo-${opcao.id}`} className="text-muted-foreground text-sm">
                {opcao.ativo ? "Ativo" : "Inativo"}
              </Label>
              <Switch
                id={`ativo-${opcao.id}`}
                checked={opcao.ativo}
                onCheckedChange={() => alternarAtivo(opcao)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
