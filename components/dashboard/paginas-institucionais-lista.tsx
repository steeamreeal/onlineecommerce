"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginaInstitucionalFormDialog } from "@/components/dashboard/pagina-institucional-form-dialog";
import { trpc } from "@/lib/trpc/client";
import type { PaginaInstitucional } from "@prisma/client";

export function PaginasInstitucionaisLista() {
  const utils = trpc.useUtils();
  const { data: paginas = [], isLoading } = trpc.paginasInstitucionais.listar.useQuery();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [paginaEmEdicao, setPaginaEmEdicao] = useState<PaginaInstitucional | null>(null);

  const excluir = trpc.paginasInstitucionais.excluir.useMutation({
    onSuccess: () => {
      utils.paginasInstitucionais.listar.invalidate();
      toast.success("Página removida.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível remover a página.");
    },
  });

  function abrirNova() {
    setPaginaEmEdicao(null);
    setDialogAberto(true);
  }

  function abrirEdicao(pagina: PaginaInstitucional) {
    setPaginaEmEdicao(pagina);
    setDialogAberto(true);
  }

  function handleExcluir(pagina: PaginaInstitucional) {
    if (!window.confirm(`Remover a página "${pagina.titulo}"?`)) return;
    excluir.mutate({ id: pagina.id });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Páginas institucionais</h1>
          <p className="text-muted-foreground text-sm">
            Escreva o conteúdo de política de privacidade, trocas e devoluções, garantia e outras
            páginas da sua loja. Elas aparecem no rodapé do site — páginas em branco não são
            publicadas.
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus className="size-4" />
          Nova página
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
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
              paginas.map((pagina) => {
                const publicada = pagina.conteudo.trim().length > 0;
                return (
                  <TableRow key={pagina.id}>
                    <TableCell className="font-medium">{pagina.titulo}</TableCell>
                    <TableCell>
                      <Badge variant={publicada ? "default" : "secondary"}>
                        {publicada ? "Publicada" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${pagina.titulo}`}
                          onClick={() => abrirEdicao(pagina)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${pagina.titulo}`}
                          disabled={excluir.isPending}
                          onClick={() => handleExcluir(pagina)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            {!isLoading && paginas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-center py-8">
                  Nenhuma página cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginaInstitucionalFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        pagina={paginaEmEdicao}
        onSalvo={() => utils.paginasInstitucionais.listar.invalidate()}
      />
    </div>
  );
}
