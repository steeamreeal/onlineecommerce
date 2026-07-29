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
import { ConvidarUsuarioDialog } from "@/components/dashboard/convidar-usuario-dialog";
import {
  PAPEL_USUARIO_DESCRICAO,
  PAPEL_USUARIO_LABEL,
  usuariosLojaMock,
  type PapelUsuario,
  type UsuarioLoja,
} from "@/lib/mocks/usuarios";

const papelSelectItems = Object.entries(PAPEL_USUARIO_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function UsuariosLista() {
  const [usuarios, setUsuarios] = useState<UsuarioLoja[]>(usuariosLojaMock);
  const [dialogAberto, setDialogAberto] = useState(false);

  function alterarPapel(usuario: UsuarioLoja, papel: PapelUsuario) {
    // Mock: sem persistência real ainda (chega no M8, autenticação e papéis reais)
    setUsuarios((atual) =>
      atual.map((u) => (u.id === usuario.id ? { ...u, papel } : u)),
    );
    toast.success(`${usuario.nome} agora é ${PAPEL_USUARIO_LABEL[papel]}.`);
  }

  function convidarUsuario(usuario: UsuarioLoja) {
    setUsuarios((atual) => [...atual, usuario]);
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
                    onValueChange={(v) => v && alterarPapel(usuario, v as PapelUsuario)}
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
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatoData.format(new Date(usuario.createdAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConvidarUsuarioDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onConvidar={convidarUsuario}
      />
    </div>
  );
}
