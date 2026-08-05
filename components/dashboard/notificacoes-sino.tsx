"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotificacoesSino() {
  const utils = trpc.useUtils();
  const { data: naoLidas } = trpc.notificacoes.contarNaoLidas.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: notificacoes } = trpc.notificacoes.listar.useQuery();
  const marcarLida = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => {
      utils.notificacoes.contarNaoLidas.invalidate();
      utils.notificacoes.listar.invalidate();
    },
  });
  const marcarTodasLidas = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => {
      utils.notificacoes.contarNaoLidas.invalidate();
      utils.notificacoes.listar.invalidate();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {!!naoLidas && naoLidas > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]"
              >
                {naoLidas > 9 ? "9+" : naoLidas}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-1.5 py-1">
            <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
            {!!naoLidas && naoLidas > 0 && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => marcarTodasLidas.mutate()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          {!notificacoes || notificacoes.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            notificacoes.map((notificacao) => (
              <DropdownMenuItem
                key={notificacao.id}
                className="items-start"
                onClick={() => {
                  if (!notificacao.lida) marcarLida.mutate({ id: notificacao.id });
                }}
                render={
                  notificacao.pedidoId ? <Link href={`/painel/pedidos/${notificacao.pedidoId}`} /> : undefined
                }
              >
                <div className="flex flex-col gap-0.5 py-1">
                  <div className="flex items-center gap-2">
                    {!notificacao.lida && <span className="bg-primary size-1.5 rounded-full" />}
                    <span className="font-medium">{notificacao.titulo}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{notificacao.mensagem}</span>
                  <span className="text-muted-foreground text-[11px]">
                    {formatoData.format(new Date(notificacao.createdAt))}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
