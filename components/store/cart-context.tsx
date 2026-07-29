"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  produtosMock,
  variacaoLabel,
  type Produto,
  type VariacaoProduto,
} from "@/lib/mocks/produtos";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [aberto, setAberto] = useState(false);

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
    return itens.flatMap((item) => {
      const produto = produtosMock.find((p) => p.id === item.produtoId);
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
  }, [itens]);

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
