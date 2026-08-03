"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ConvidarAdminDialog } from "@/components/admin/convidar-admin-dialog";
import { trpc } from "@/lib/trpc/client";

type PapelAdmin = "SUPER_ADMIN" | "SUPORTE" | "FINANCEIRO";

const PAPEL_ADMIN_LABEL: Record<PapelAdmin, string> = {
  SUPER_ADMIN: "Super admin",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
};

const PAPEL_ADMIN_DESCRICAO: Record<PapelAdmin, string> = {
  SUPER_ADMIN: "Acesso total à plataforma, incluindo outros usuários admin",
  SUPORTE: "Consulta lojas e pode bloquear/liberar, sem acesso financeiro",
  FINANCEIRO: "Consulta planos, assinaturas e métricas de faturamento",
};

const papelSelectItems = Object.entries(PAPEL_ADMIN_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function AdminUsuariosLista() {
  const [dialogAberto, setDialogAberto] = useState(false);
  const utils = trpc.useUtils();
  const { data: usuarios, isLoading } = trpc.admin.listarUsuariosPlataforma.useQuery();

  const alterarPapel = trpc.admin.alterarPapelUsuarioPlataforma.useMutation({
    onSuccess: () => {
      utils.admin.listarUsuariosPlataforma.invalidate();
      toast.success("Papel atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o papel."),
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários da plataforma</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie quem tem acesso ao painel administrativo do SaaS.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="size-4" />
          Conceder acesso
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              usuarios?.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="font-medium">{usuario.nome}</div>
                    <div className="text-muted-foreground text-xs">{usuario.email}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      items={papelSelectItems}
                      value={usuario.papelAdmin ?? undefined}
                      onValueChange={(v) =>
                        v && alterarPapel.mutate({ id: usuario.id, papel: v as PapelAdmin })
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
                                {PAPEL_ADMIN_DESCRICAO[item.value as PapelAdmin]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatoData.format(new Date(usuario.createdAt))}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ConvidarAdminDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
