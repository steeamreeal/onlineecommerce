import { Check } from "lucide-react";

import { planosMock } from "@/lib/mocks/planos";
import { lojasPorPlano } from "@/lib/mocks/metricas";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PlanosLista() {
  const distribuicao = lojasPorPlano();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Planos e assinaturas</h1>
        <p className="text-muted-foreground text-sm">
          Planos disponíveis na plataforma e seus limites.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {planosMock.map((plano) => {
          const quantidade =
            distribuicao.find((d) => d.planoId === plano.id)?.quantidade ?? 0;
          return (
            <div key={plano.id} className="flex flex-col gap-4 rounded-lg border p-5">
              <div>
                <h2 className="text-lg font-semibold">{plano.nome}</h2>
                <p className="text-2xl font-semibold">
                  {formatoMoeda.format(plano.precoMensal)}
                  <span className="text-muted-foreground text-sm font-normal">/mês</span>
                </p>
              </div>

              <div className="text-muted-foreground text-sm">
                <p>
                  {plano.limiteProdutos === null
                    ? "Produtos ilimitados"
                    : `Até ${plano.limiteProdutos} produtos`}
                </p>
                <p>
                  {plano.limiteUsuarios === null
                    ? "Usuários ilimitados"
                    : `Até ${plano.limiteUsuarios} usuários`}
                </p>
              </div>

              <ul className="flex flex-col gap-2 text-sm">
                {plano.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="text-success size-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <p className="text-muted-foreground mt-auto text-sm">
                {quantidade} loja(s) neste plano
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
