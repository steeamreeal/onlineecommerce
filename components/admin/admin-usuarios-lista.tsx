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
import { ConvidarAdminDialog } from "@/components/admin/convidar-admin-dialog";
import {
  PAPEL_ADMIN_DESCRICAO,
  PAPEL_ADMIN_LABEL,
  usuariosAdminMock,
  type PapelAdmin,
  type UsuarioAdmin,
} from "@/lib/mocks/admin-usuarios";

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
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>(usuariosAdminMock);
  const [dialogAberto, setDialogAberto] = useState(false);

  function alterarPapel(usuario: UsuarioAdmin, papel: PapelAdmin) {
    // Mock: sem persistência real ainda (chega no M14, backend do painel admin)
    setUsuarios((atual) =>
      atual.map((u) => (u.id === usuario.id ? { ...u, papel } : u)),
    );
    toast.success(`${usuario.nome} agora é ${PAPEL_ADMIN_LABEL[papel]}.`);
  }

  function convidarUsuario(usuario: UsuarioAdmin) {
    setUsuarios((atual) => [...atual, usuario]);
  }

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>
                  <div className="font-medium">{usuario.nome}</div>
                  <div className="text-muted-foreground text-xs">{usuario.email}</div>
                </TableCell>
                <TableCell>
                  <Select
                    items={papelSelectItems}
                    value={usuario.papel}
                    onValueChange={(v) => v && alterarPapel(usuario, v as PapelAdmin)}
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

      <ConvidarAdminDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConvidar={convidarUsuario}
      />
    </div>
  );
}
