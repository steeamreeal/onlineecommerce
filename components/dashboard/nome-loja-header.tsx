"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAPEL_USUARIO_LABEL } from "@/lib/papel-usuario";
import { trpc } from "@/lib/trpc/client";

// Mesma query de AcessoLojaGuard (loja.atual) — o React Query deduplica a
// chamada de rede, então não custa uma segunda requisição.
export function NomeLojaHeader() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: loja } = trpc.loja.atual.useQuery();
  const { data: minhas } = trpc.minhasLojas.listar.useQuery();

  const selecionar = trpc.minhasLojas.selecionar.useMutation({
    onSuccess: async () => {
      // Todo dado do painel é da loja anterior — descarta o cache inteiro.
      await utils.invalidate();
      router.refresh();
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível trocar de loja."),
  });

  const nome = loja?.nome ?? "Painel da loja";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
            {nome}
            <ChevronsUpDownIcon className="text-muted-foreground size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Minhas lojas</DropdownMenuLabel>
          {minhas?.lojas.map((item) => (
            <DropdownMenuItem
              key={item.id}
              disabled={selecionar.isPending}
              onClick={() => {
                if (item.id !== minhas.ativaId) selecionar.mutate({ lojaId: item.id });
              }}
            >
              <div className="flex flex-1 flex-col">
                <span className="font-medium">{item.nome}</span>
                <span className="text-muted-foreground text-xs">{PAPEL_USUARIO_LABEL[item.papel]}</span>
              </div>
              {item.id === minhas.ativaId && <CheckIcon className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/onboarding" />}>
          <PlusIcon className="size-4" />
          Criar nova loja
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
