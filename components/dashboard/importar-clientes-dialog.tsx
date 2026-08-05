"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import { parseCsvClientes } from "@/lib/csv-clientes";

export function ImportarClientesDialog({ onImportado }: { onImportado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [processando, setProcessando] = useState(false);

  const importar = trpc.clientes.importarVarios.useMutation();

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setProcessando(true);
    try {
      const conteudo = await arquivo.text();
      const linhas = parseCsvClientes(conteudo);
      if (linhas.length === 0) {
        toast.error("O CSV não tem nenhuma linha de cliente.");
        return;
      }

      const resultado = await importar.mutateAsync({
        clientes: linhas
          .filter((l) => l.nome)
          .map((l) => ({
            nome: l.nome,
            telefone: l.telefone,
            email: l.email,
            documento: l.documento,
            cidade: l.cidade,
            estado: l.estado,
            totalGastoAnterior: l.totalGastoAnterior,
            ultimaCompraAnterior: l.ultimaCompraAnterior,
          })),
      });

      toast.success(
        resultado.ignorados > 0
          ? `${resultado.importados} cliente(s) importado(s). ${resultado.ignorados} ignorado(s) por já existirem (telefone/e-mail duplicado).`
          : `${resultado.importados} cliente(s) importado(s).`,
      );
      onImportado?.();
      setOpen(false);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível importar o arquivo. Confira o formato do CSV.";
      toast.error(mensagem);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Importar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar clientes</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV com a coluna <strong>nome</strong> (obrigatória) e, opcionalmente,{" "}
            telefone, email, documento, cidade, estado, totalGastoAnterior e ultimaCompraAnterior.
            Clientes com telefone ou e-mail já cadastrado são ignorados.
          </DialogDescription>
        </DialogHeader>

        <label className="border-input hover:bg-accent flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-sm has-disabled:pointer-events-none has-disabled:opacity-50">
          <Upload className="size-5" />
          {processando ? "Importando..." : "Selecionar arquivo CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={processando}
            onChange={handleArquivo}
          />
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
