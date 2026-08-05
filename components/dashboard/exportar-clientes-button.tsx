"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { COLUNAS_EXPORTACAO, baixarArquivo, gerarCsv } from "@/lib/csv-clientes";

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ExportarClientesButton() {
  const utils = trpc.useUtils();

  async function handleExportar() {
    try {
      const clientes = await utils.clientes.exportar.fetch();
      if (clientes.length === 0) {
        toast.error("Nenhum cliente para exportar.");
        return;
      }

      const linhas = clientes.map((c) => ({
        nome: c.nome,
        telefone: c.telefone ?? "",
        email: c.email ?? "",
        documento: c.documento ?? "",
        cidade: c.cidade ?? "",
        estado: c.estado ?? "",
        totalGasto: c.totalGasto.toFixed(2),
        ultimaCompra: c.ultimaCompra ? formatoData.format(new Date(c.ultimaCompra)) : "",
      }));

      const csv = gerarCsv(linhas, COLUNAS_EXPORTACAO);
      baixarArquivo(`clientes-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
      toast.success(`${clientes.length} cliente(s) exportado(s).`);
    } catch {
      toast.error("Não foi possível exportar os clientes. Tente novamente.");
    }
  }

  return (
    <Button variant="outline" onClick={handleExportar}>
      <Download className="size-4" />
      Exportar
    </Button>
  );
}
