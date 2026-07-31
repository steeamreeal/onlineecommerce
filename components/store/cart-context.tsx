"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];
type VariacaoProduto = Produto["variacoes"][number];

export type CartItem = {
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  precoUnitario: number;
};

export type CartItemDetalhado = CartItem & {
  produto: Produto;
  variacao?: VariacaoProduto;
  variacaoNome: string;
  subtotal: number;
};

type CartContextValue = {
  itens: CartItem[];
  itensDetalhados: CartItemDetalhado[];
  quantidadeTotal: number;
  subtotal: number;
  aberto: boolean;
  setAberto: (aberto: boolean) => void;
  adicionarItem: (item: CartItem) => void;
  removerItem: (variacaoId: string) => void;
  atualizarQuantidade: (variacaoId: string, quantidade: number) => void;
  limparCarrinho: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function variacaoLabel(v: { cor?: string | null; tamanho?: string | null; modelo?: string | null }) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

export function CartProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [aberto, setAberto] = useState(false);

  // Carrinho guarda só ids/quantidade; os dados do produto (preço, nome,
  // estoque) são resolvidos aqui a partir do catálogo público, sempre
  // escopado por loja via slug — nunca confia em dado vindo do client.
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery({ slug });

  function adicionarItem(novoItem: CartItem) {
    setItens((atual) => {
      const existente = atual.find((item) => item.variacaoId === novoItem.variacaoId);
      if (existente) {
        return atual.map((item) =>
          item.variacaoId === novoItem.variacaoId
            ? { ...item, quantidade: item.quantidade + novoItem.quantidade }
            : item,
        );
      }
      return [...atual, novoItem];
    });
    setAberto(true);
  }

  function removerItem(variacaoId: string) {
    setItens((atual) => atual.filter((item) => item.variacaoId !== variacaoId));
  }

  function atualizarQuantidade(variacaoId: string, quantidade: number) {
    if (quantidade < 1) {
      removerItem(variacaoId);
      return;
    }
    setItens((atual) =>
      atual.map((item) => (item.variacaoId === variacaoId ? { ...item, quantidade } : item)),
    );
  }

  function limparCarrinho() {
    setItens([]);
  }

  const itensDetalhados = useMemo<CartItemDetalhado[]>(() => {
    if (!produtos) return [];
    return itens.flatMap((item) => {
      const produto = produtos.find((p) => p.id === item.produtoId);
      if (!produto) return [];
      const variacao = produto.variacoes.find((v) => v.id === item.variacaoId);
      if (!variacao && produto.variacoes.length > 0) return [];
      return [
        {
          ...item,
          produto,
          variacao,
          variacaoNome: variacao ? variacaoLabel(variacao) : "Padrão",
          subtotal: item.precoUnitario * item.quantidade,
        },
      ];
    });
  }, [itens, produtos]);

  const quantidadeTotal = useMemo(
    () => itens.reduce((total, item) => total + item.quantidade, 0),
    [itens],
  );

  const subtotal = useMemo(
    () => itensDetalhados.reduce((total, item) => total + item.subtotal, 0),
    [itensDetalhados],
  );

  return (
    <CartContext.Provider
      value={{
        itens,
        itensDetalhados,
        quantidadeTotal,
        subtotal,
        aberto,
        setAberto,
        adicionarItem,
        removerItem,
        atualizarQuantidade,
        limparCarrinho,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return context;
}
