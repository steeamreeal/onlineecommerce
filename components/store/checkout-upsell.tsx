"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-context";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Sugestão de produto pra adicionar ao carrinho antes de fechar o pedido
// ("mais vendidos" primeiro; loja nova sem vendas ainda cai pra produtos da
// mesma categoria do que já está no carrinho, e por último qualquer produto
// disponível — nunca fica sem sugestão nenhuma). Cálculo todo no client, sem
// nenhuma query além das que a página já usa em outros lugares do site.
export function selecionarSugestoesUpsell(
  produtos: Produto[],
  idsNoCarrinho: Set<string>,
  categoriasNoCarrinho: Set<string>,
  rankingMaisVendidos: string[] | undefined,
  limite = 4,
): Produto[] {
  const candidatos = produtos.filter((p) => {
    if (idsNoCarrinho.has(p.id)) return false;
    const temEstoque = p.variacoes.length === 0 || p.variacoes.some((v) => v.estoque > 0);
    return temEstoque;
  });

  const porId = new Map(candidatos.map((p) => [p.id, p]));
  const maisVendidos = (rankingMaisVendidos ?? [])
    .map((id) => porId.get(id))
    .filter((p): p is Produto => Boolean(p));
  if (maisVendidos.length > 0) return maisVendidos.slice(0, limite);

  if (categoriasNoCarrinho.size > 0) {
    const daMesmaCategoria = candidatos.filter(
      (p) => p.categoria && categoriasNoCarrinho.has(p.categoria.id),
    );
    if (daMesmaCategoria.length > 0) return daMesmaCategoria.slice(0, limite);
  }

  return candidatos.slice(0, limite);
}

export function CheckoutUpsell({ slug }: { slug: string }) {
  const { itensDetalhados, adicionarItem } = useCart();
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery({ slug });
  const { data: rankingMaisVendidos } = trpc.lojaPublica.produtosMaisVendidos.useQuery({ slug });

  if (!produtos) return null;

  const idsNoCarrinho = new Set(itensDetalhados.map((i) => i.produtoId));
  const categoriasNoCarrinho = new Set(
    itensDetalhados.map((i) => i.produto.categoria?.id).filter((id): id is string => Boolean(id)),
  );

  const sugestoes = selecionarSugestoesUpsell(
    produtos,
    idsNoCarrinho,
    categoriasNoCarrinho,
    rankingMaisVendidos,
  );

  if (sugestoes.length === 0) return null;

  function handleAdicionar(produto: Produto) {
    const variacaoDisponivel = produto.variacoes.find((v) => v.estoque > 0);
    const preco = Number(produto.precoPromo ?? produto.precoNormal);
    adicionarItem({
      produtoId: produto.id,
      variacaoId: variacaoDisponivel?.id ?? produto.id,
      quantidade: 1,
      precoUnitario: preco,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <span className="text-sm font-medium">Aproveite e leve também</span>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sugestoes.map((produto) => {
          const capa = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
          const preco = Number(produto.precoPromo ?? produto.precoNormal);
          return (
            <div key={produto.id} className="flex w-28 shrink-0 flex-col gap-1.5">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-md">
                {capa && capa.tipo === "IMAGEM" && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
                  <img src={capa.url} alt={produto.nome} className="size-full object-cover" />
                )}
              </div>
              <span className="line-clamp-2 text-xs">{produto.nome}</span>
              <span className="text-xs font-semibold">{formatoMoeda.format(preco)}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleAdicionar(produto)}
              >
                <Plus className="size-3" />
                Adicionar
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
