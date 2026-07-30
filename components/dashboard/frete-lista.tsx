"use client";

import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TIPO_FRETE_LABEL, type TipoFrete } from "@/lib/frete";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function FreteLista() {
  const utils = trpc.useUtils();
  const { data: opcoes = [], isLoading } = trpc.frete.listar.useQuery();
  const alternarAtivo = trpc.frete.alternarAtivo.useMutation({
    onSuccess: () => utils.frete.listar.invalidate(),
  });

  async function handleAlternar(opcao: (typeof opcoes)[number]) {
    try {
      await alternarAtivo.mutateAsync({ id: opcao.id });
      toast.success(`"${opcao.nome}" ${opcao.ativo ? "desativado" : "ativado"}.`);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível atualizar a opção de frete.";
      toast.error(mensagem);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Frete e entrega</h1>
        <p className="text-muted-foreground text-sm">
          Configure as opções de frete disponíveis para os clientes da sua loja.
        </p>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
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
                    {TIPO_FRETE_LABEL[opcao.tipo as TipoFrete]}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {opcao.valor != null
                    ? Number(opcao.valor) === 0
                      ? "Grátis"
                      : formatoMoeda.format(Number(opcao.valor))
                    : "Valor calculado no checkout"}
                  {opcao.freteGratisAcimaDe != null &&
                    ` · grátis acima de ${formatoMoeda.format(Number(opcao.freteGratisAcimaDe))}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`ativo-${opcao.id}`} className="text-muted-foreground text-sm">
                  {opcao.ativo ? "Ativo" : "Inativo"}
                </Label>
                <Switch
                  id={`ativo-${opcao.id}`}
                  checked={opcao.ativo}
                  disabled={alternarAtivo.isPending}
                  onCheckedChange={() => handleAlternar(opcao)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
