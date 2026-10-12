"use client";

import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Estoquista e Separador não têm dashboard financeiro: em vez de uma tela de
// zeros (a API recusa), mostra o atalho para o que cada um faz.
export function BoasVindasOperacional({ papel }: { papel: "ESTOQUISTA" | "SEPARADOR" }) {
  const estoquista = papel === "ESTOQUISTA";

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Bem-vindo</h1>
        <p className="text-muted-foreground text-sm">
          {estoquista
            ? "Cadastre produtos e controle o estoque da loja."
            : "Consulte e separe os itens dos pedidos."}
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          {estoquista ? <Package className="text-muted-foreground size-6" /> : <ShoppingCart className="text-muted-foreground size-6" />}
          <CardTitle>{estoquista ? "Produtos e estoque" : "Pedidos"}</CardTitle>
          <CardDescription>
            {estoquista
              ? "Veja os produtos, registre entradas e saídas e acompanhe o estoque baixo."
              : "Veja os pedidos e acompanhe o que precisa ser separado e enviado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href={estoquista ? "/painel/produtos" : "/painel/pedidos"} />}
          >
            {estoquista ? "Ir para produtos" : "Ir para pedidos"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
