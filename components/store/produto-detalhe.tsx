"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { useCart } from "@/components/store/cart-context";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtoPorId"];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function variacaoLabel(v: { cor?: string | null; tamanho?: string | null; modelo?: string | null }) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

export function ProdutoDetalhe({ produto, slug }: { produto: Produto; slug: string }) {
  const { adicionarItem } = useCart();
  const [variacaoId, setVariacaoId] = useState<string | undefined>(
    produto.variacoes.find((v) => v.estoque > 0)?.id,
  );
  const midias = [...produto.fotos].sort((a, b) => a.ordem - b.ordem);
  const [midiaSelecionadaId, setMidiaSelecionadaId] = useState<string | undefined>(midias[0]?.id);
  const midiaSelecionada = midias.find((m) => m.id === midiaSelecionadaId) ?? midias[0];

  const { data: relacionadosBrutos } = trpc.lojaPublica.produtos.useQuery({
    slug,
    categoriaId: produto.categoriaId ?? undefined,
  });
  const relacionados = (relacionadosBrutos ?? []).filter((p) => p.id !== produto.id);

  const semVariacoes = produto.variacoes.length === 0;
  const variacaoSelecionada = semVariacoes
    ? undefined
    : produto.variacoes.find((v) => v.id === variacaoId);
  const podeComprar = semVariacoes || Boolean(variacaoSelecionada);
  const preco = Number(produto.precoPromo ?? produto.precoNormal);

  function handleAdicionar() {
    if (!podeComprar) return;
    adicionarItem({
      produtoId: produto.id,
      variacaoId: variacaoSelecionada?.id ?? produto.id,
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
          {produto.categoria?.nome ?? "Sem categoria"}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{produto.nome}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="bg-muted aspect-square overflow-hidden rounded-lg">
            {midiaSelecionada?.tipo === "VIDEO" ? (
              <video
                src={midiaSelecionada.url}
                className="size-full object-cover"
                controls
                playsInline
              />
            ) : midiaSelecionada ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
              <img src={midiaSelecionada.url} alt={produto.nome} className="size-full object-cover" />
            ) : null}
          </div>
          {midias.length > 1 && (
            <div className="flex gap-2">
              {midias.map((midia) => (
                <button
                  key={midia.id}
                  type="button"
                  onClick={() => setMidiaSelecionadaId(midia.id)}
                  className={`bg-muted size-16 shrink-0 overflow-hidden rounded-md border-2 ${
                    midia.id === midiaSelecionada?.id ? "border-foreground" : "border-transparent"
                  }`}
                >
                  {midia.tipo === "VIDEO" ? (
                    <video src={midia.url} className="size-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
                    <img src={midia.url} alt="" className="size-full object-cover" />
                  )}
                </button>
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
                {formatoMoeda.format(Number(produto.precoNormal))}
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

          <Button size="lg" className="w-full" disabled={!podeComprar} onClick={handleAdicionar}>
            {podeComprar ? "Adicionar ao carrinho" : "Produto esgotado"}
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
