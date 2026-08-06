"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/components/store/cart-context";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CartSheet({ slug }: { slug: string }) {
  const { aberto, setAberto, itensDetalhados, subtotal, atualizarQuantidade, removerItem } =
    useCart();

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Seu carrinho</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          {itensDetalhados.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-sm">
              <ShoppingBag className="size-8" />
              Seu carrinho está vazio.
            </div>
          ) : (
            itensDetalhados.map((item) => {
              const midias = [...item.produto.fotos].sort((a, b) => a.ordem - b.ordem);
              const capaPadrao = midias.find((f) => f.tipo === "IMAGEM") ?? midias[0];
              const capa = item.variacao?.foto ?? capaPadrao;
              return (
              <div key={item.variacaoId} className="flex gap-3 border-b pb-4">
                <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                  {capa &&
                    (capa.tipo === "VIDEO" ? (
                      <video src={capa.url} className="size-full object-cover" muted />
                    ) : (
                      <img src={capa.url} alt={item.produto.nome} className="size-full object-cover" />
                    ))}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{item.produto.nome}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removerItem(item.variacaoId)}
                    >
                      <X />
                    </Button>
                  </div>
                  <span className="text-muted-foreground text-xs">{item.variacaoNome}</span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => atualizarQuantidade(item.variacaoId, item.quantidade - 1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantidade}</span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => atualizarQuantidade(item.variacaoId, item.quantidade + 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                    <span className="text-sm font-medium">
                      {formatoMoeda.format(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {itensDetalhados.length > 0 && (
          <SheetFooter>
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>{formatoMoeda.format(subtotal)}</span>
            </div>
            <Button
              nativeButton={false}
              render={<Link href={`/loja/${slug}/checkout`} />}
              onClick={() => setAberto(false)}
            >
              Finalizar compra
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
