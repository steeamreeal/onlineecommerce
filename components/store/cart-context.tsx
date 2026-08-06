"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  // Falso até o carrinho salvo no localStorage ser lido (só acontece após o
  // mount, no client) — usado para não mostrar "carrinho vazio" por engano
  // no primeiro render enquanto o carrinho salvo ainda está sendo carregado.
  hidratado: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function variacaoLabel(v: { cor?: string | null; tamanho?: string | null; modelo?: string | null }) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

function chaveStorage(slug: string) {
  return `carrinho:${slug}`;
}

// Lê o carrinho salvo no localStorage desta loja (escopado por slug, cada
// loja tem seu próprio carrinho). Só roda no client — no SSR o localStorage
// não existe, então o primeiro render sempre parte de array vazio e é
// hidratado no useEffect abaixo.
function lerCarrinhoSalvo(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(chaveStorage(slug));
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
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
  const [hidratado, setHidratado] = useState(false);

  // Hidrata a partir do localStorage após o mount (evita mismatch de SSR) e
  // sempre que o slug mudar (navegação entre lojas usa o mesmo Provider).
  useEffect(() => {
    setItens(lerCarrinhoSalvo(slug));
    setHidratado(true);
  }, [slug]);

  // Persiste toda alteração do carrinho, mas só depois de já ter hidratado —
  // sem essa guarda, o array vazio do primeiro render sobrescreveria o
  // carrinho salvo antes do useEffect acima conseguir lê-lo.
  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(chaveStorage(slug), JSON.stringify(itens));
    } catch {
      // Storage indisponível (modo privado, quota excedida) — carrinho
      // segue funcionando em memória, só sem persistir entre sessões.
    }
  }, [slug, itens, hidratado]);

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

  // Sem useMemo aqui, esse objeto era recriado a cada render do provider —
  // qualquer useCart() (agora inclusive cada ProductCard de uma listagem
  // inteira, não só cabeçalho/carrinho) re-renderizava junto, mesmo sem
  // nenhum dado relevante para ele ter mudado. Numa loja com muitos
  // produtos isso trava o main thread por alguns segundos bem na tela que
  // mais precisa disso — o preview do editor de tema, que mostra o
  // catálogo inteiro de uma vez.
  const value = useMemo<CartContextValue>(
    () => ({
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
      hidratado,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as funções (adicionarItem, removerItem, atualizarQuantidade, limparCarrinho) são recriadas a cada render mas só fecham sobre setItens/setAberto (estáveis) — incluí-las quebraria a memoização sem motivo real
    [itens, itensDetalhados, quantidadeTotal, subtotal, aberto, hidratado],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return context;
}
