"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

// Só aparece quando o login tem acesso a mais de uma loja (ex.: mesmo
// lojista com loja de roupas e loja de calçados - UsuarioLoja permite N
// lojas por usuário). Troca a loja "ativa" via cookie (app/api/loja-ativa)
// e recarrega a página para todo o painel (tRPC context, RSC) refletir a
// loja recém-selecionada.
export function TrocadorLoja() {
  const { data: minhasLojas = [] } = trpc.usuariosLoja.minhasLojas.useQuery();
  const { data: lojaAtual } = trpc.loja.atual.useQuery();
  const [trocando, setTrocando] = useState(false);

  if (minhasLojas.length < 2) {
    return null;
  }

  async function trocarPara(lojaId: string) {
    if (lojaId === lojaAtual?.id) return;
    setTrocando(true);
    try {
      const resposta = await fetch("/api/loja-ativa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojaId }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.error ?? "Não foi possível trocar de loja.");
      }
      window.location.assign("/painel");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível trocar de loja.");
      setTrocando(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={trocando} className="gap-2">
            <Store className="size-4" />
            {trocando ? "Trocando..." : "Trocar loja"}
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Suas lojas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {minhasLojas.map((loja) => (
          <DropdownMenuItem key={loja.lojaId} onClick={() => trocarPara(loja.lojaId)}>
            <div className="flex flex-1 flex-col">
              <span>{loja.nome}</span>
              <span className="text-muted-foreground text-xs">
                {loja.statusPlano === "BLOQUEADO" ? "Bloqueada" : loja.slug}
              </span>
            </div>
            {loja.lojaId === lojaAtual?.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
