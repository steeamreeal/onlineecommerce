"use client";

import { useState } from "react";
import { Crown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConvidarUsuarioDialog } from "@/components/dashboard/convidar-usuario-dialog";
import { PAPEL_USUARIO_DESCRICAO, PAPEL_USUARIO_LABEL } from "@/lib/papel-usuario";
import { trpc } from "@/lib/trpc/client";
import type { PapelUsuario } from "@prisma/client";

// DONO não entra no dropdown de troca de papel — vira o próprio papel de
// alguém só por "Tornar dono" (ver botão abaixo), nunca escolhido direto
// numa lista ao lado de Gerente/Vendedor/etc.
const papelSelectItems = Object.entries(PAPEL_USUARIO_LABEL)
  .filter(([value]) => value !== "DONO")
  .map(([value, label]) => ({ value, label }));

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function UsuariosLista() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.usuariosLoja.listar.useQuery();

  const alterarPapel = trpc.usuariosLoja.alterarPapel.useMutation({
    onSuccess: () => {
      utils.usuariosLoja.listar.invalidate();
      toast.success("Papel atualizado.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível atualizar o papel."),
  });

  const cancelarConvite = trpc.usuariosLoja.cancelarConvite.useMutation({
    onSuccess: () => {
      utils.usuariosLoja.listar.invalidate();
      toast.success("Convite cancelado.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível cancelar o convite."),
  });

  const remover = trpc.usuariosLoja.remover.useMutation({
    onSuccess: () => {
      utils.usuariosLoja.listar.invalidate();
      toast.success("Acesso removido.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível remover o acesso."),
  });

  const tornarDono = trpc.usuariosLoja.alterarPapel.useMutation({
    onSuccess: () => {
      utils.usuariosLoja.listar.invalidate();
      toast.success("Dono da loja atualizado.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível transferir o papel de dono."),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Gerencie quem tem acesso ao painel da sua loja e com qual papel.
        </p>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Convidar usuário
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.usuarios.map((vinculo) => {
              const ehDono = vinculo.papel === "DONO";
              // Só o dono atual pode transferir o papel; numa loja sem dono
              // ainda (criada antes desse papel existir), qualquer
              // ADMINISTRADOR pode fazer a primeira atribuição.
              const podeTornarDono = !ehDono && (data.souDono || !data.existeDono);

              return (
                <TableRow key={vinculo.id}>
                  <TableCell>
                    <div className="font-medium">{vinculo.usuario.nome}</div>
                    <div className="text-muted-foreground text-xs">{vinculo.usuario.email}</div>
                  </TableCell>
                  <TableCell>
                    {ehDono ? (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="size-3.5" />
                        Dono da loja
                      </Badge>
                    ) : (
                      <Select
                        items={papelSelectItems}
                        value={vinculo.papel}
                        onValueChange={(v) =>
                          v && alterarPapel.mutate({ usuarioLojaId: vinculo.id, papel: v as PapelUsuario })
                        }
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {papelSelectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              <div className="flex flex-col">
                                <span>{item.label}</span>
                                <span className="text-muted-foreground text-xs">
                                  {PAPEL_USUARIO_DESCRICAO[item.value as PapelUsuario]}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatoData.format(new Date(vinculo.createdAt))}
                  </TableCell>
                  <TableCell>
                    {!ehDono && (
                      <div className="flex items-center justify-end gap-1">
                        {podeTornarDono && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Tornar dono da loja"
                            title="Tornar dono da loja"
                            onClick={() =>
                              tornarDono.mutate({ usuarioLojaId: vinculo.id, papel: "DONO" })
                            }
                          >
                            <Crown className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover acesso"
                          title="Remover acesso"
                          onClick={() => remover.mutate({ usuarioLojaId: vinculo.id })}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {data.convites.map((convite) => (
              <TableRow key={convite.id}>
                <TableCell>
                  <div className="font-medium">{convite.email}</div>
                  <Badge variant="secondary" className="mt-1">
                    Convite pendente
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {PAPEL_USUARIO_LABEL[convite.papel]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatoData.format(new Date(convite.createdAt))}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelarConvite.mutate({ id: convite.id })}
                  >
                    <X className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConvidarUsuarioDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
