"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { useCart } from "@/components/store/cart-context";
import {
  categoriaNome,
  produtosMock,
  variacaoLabel,
  type Produto,
} from "@/lib/mocks/produtos";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProdutoDetalhe({ produto, slug }: { produto: Produto; slug: string }) {
  const { adicionarItem } = useCart();
  const [variacaoId, setVariacaoId] = useState<string | undefined>(
    produto.variacoes.find((v) => v.estoque > 0)?.id,
  );

  const variacaoSelecionada = produto.variacoes.find((v) => v.id === variacaoId);
  const preco = produto.precoPromo ?? produto.precoNormal;

  const relacionados = useMemo(
    () =>
      produtosMock.filter(
        (p) =>
          p.id !== produto.id &&
          p.categoriaId === produto.categoriaId &&
          p.status !== "INATIVO",
      ),
    [produto],
  );

  function handleAdicionar() {
    if (!variacaoSelecionada) return;
    adicionarItem({
      produtoId: produto.id,
      variacaoId: variacaoSelecionada.id,
      quantidade: 1,
      precoUnitario: preco,
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-8">
      <nav className="text-muted-foreground flex items-center gap-1 text-sm">
        <Link href={`/loja/${slug}`} className="hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/loja/${slug}/produtos?categoria=${produto.categoriaId ?? ""}`}
          className="hover:text-foreground"
        >
          {categoriaNome(produto.categoriaId)}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{produto.nome}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="bg-muted aspect-square rounded-lg" />
          {produto.fotos.length > 1 && (
            <div className="flex gap-2">
              {produto.fotos.map((foto) => (
                <div key={foto.id} className="bg-muted size-16 rounded-md" />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{produto.nome}</h1>
            {produto.descricao && (
              <p className="text-muted-foreground mt-1 text-sm">{produto.descricao}</p>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            {produto.precoPromo && (
              <span className="text-muted-foreground text-sm line-through">
                {formatoMoeda.format(produto.precoNormal)}
              </span>
            )}
            <span className="text-2xl font-semibold">{formatoMoeda.format(preco)}</span>
          </div>

          {produto.variacoes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Escolha uma opção</span>
              <div className="flex flex-wrap gap-2">
                {produto.variacoes.map((variacao) => {
                  const esgotada = variacao.estoque === 0;
                  const selecionada = variacao.id === variacaoId;
                  return (
                    <button
                      key={variacao.id}
                      type="button"
                      disabled={esgotada}
                      onClick={() => setVariacaoId(variacao.id)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        selecionada ? "border-primary bg-primary/5" : "hover:border-primary/40"
                      } ${esgotada ? "text-muted-foreground cursor-not-allowed line-through opacity-50" : ""}`}
                    >
                      {variacaoLabel(variacao)}
                      {esgotada ? " (esgotado)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!variacaoSelecionada}
            onClick={handleAdicionar}
          >
            {variacaoSelecionada ? "Adicionar ao carrinho" : "Produto esgotado"}
          </Button>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relacionados.map((p) => (
              <ProductCard key={p.id} produto={p} slug={slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
