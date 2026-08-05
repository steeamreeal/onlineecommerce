"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

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
import { parseCsv } from "@/lib/csv";
import { trpc } from "@/lib/trpc/client";

const COLUNAS_ESPERADAS = ["produto", "cor", "tamanho", "modelo", "quantidade"];

type LinhaImportacao = {
  produto: string;
  cor?: string;
  tamanho?: string;
  modelo?: string;
  quantidade: number;
};

function normalizarCabecalho(cabecalho: string) {
  return cabecalho.trim().toLowerCase();
}

function converterParaLinhas(linhasCsv: string[][]): { linhas: LinhaImportacao[]; erro?: string } {
  if (linhasCsv.length < 2) {
    return { linhas: [], erro: "A planilha precisa de um cabeçalho e ao menos uma linha de dados." };
  }

  const cabecalho = linhasCsv[0].map(normalizarCabecalho);
  const indiceProduto = cabecalho.indexOf("produto");
  const indiceQuantidade = cabecalho.indexOf("quantidade");
  if (indiceProduto === -1 || indiceQuantidade === -1) {
    return {
      linhas: [],
      erro: `A planilha precisa ter as colunas "produto" e "quantidade" (colunas aceitas: ${COLUNAS_ESPERADAS.join(", ")}).`,
    };
  }
  const indiceCor = cabecalho.indexOf("cor");
  const indiceTamanho = cabecalho.indexOf("tamanho");
  const indiceModelo = cabecalho.indexOf("modelo");

  const linhas: LinhaImportacao[] = [];
  for (const linhaCsv of linhasCsv.slice(1)) {
    const produto = (linhaCsv[indiceProduto] ?? "").trim();
    const quantidadeTexto = (linhaCsv[indiceQuantidade] ?? "").trim();
    if (!produto || !quantidadeTexto) continue;

    const quantidade = Number(quantidadeTexto);
    if (!Number.isInteger(quantidade) || quantidade < 0) continue;

    linhas.push({
      produto,
      cor: indiceCor >= 0 ? linhaCsv[indiceCor]?.trim() || undefined : undefined,
      tamanho: indiceTamanho >= 0 ? linhaCsv[indiceTamanho]?.trim() || undefined : undefined,
      modelo: indiceModelo >= 0 ? linhaCsv[indiceModelo]?.trim() || undefined : undefined,
      quantidade,
    });
  }

  return { linhas };
}

export function ImportarEstoqueDialog({ onImportado }: { onImportado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([]);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  const importar = trpc.estoque.importar.useMutation();

  function limpar() {
    setNomeArquivo(null);
    setLinhas([]);
    setErroArquivo(null);
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setNomeArquivo(arquivo.name);
    setErroArquivo(null);
    setLinhas([]);

    try {
      const texto = await arquivo.text();
      const linhasCsv = parseCsv(texto);
      const resultado = converterParaLinhas(linhasCsv);
      if (resultado.erro) {
        setErroArquivo(resultado.erro);
        return;
      }
      if (resultado.linhas.length === 0) {
        setErroArquivo("Nenhuma linha válida encontrada na planilha.");
        return;
      }
      setLinhas(resultado.linhas);
    } catch {
      setErroArquivo("Não foi possível ler o arquivo. Envie um CSV válido (no Excel: Salvar como > CSV).");
    }
  }

  async function handleImportar() {
    try {
      const resultado = await importar.mutateAsync({ linhas });
      onImportado?.();
      if (resultado.naoEncontrados.length > 0) {
        toast.warning(
          `${resultado.atualizados} variações atualizadas. ${resultado.naoEncontrados.length} linhas não encontraram um produto/variação correspondente.`,
        );
      } else {
        toast.success(`${resultado.atualizados} variações de estoque atualizadas.`);
      }
      setOpen(false);
      limpar();
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível importar a planilha.";
      toast.error(mensagem);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) limpar();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Importar estoque</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar estoque via CSV</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV (no Excel: Arquivo → Salvar como → CSV) com as colunas{" "}
            <code>produto</code>, <code>cor</code>, <code>tamanho</code>, <code>modelo</code> e{" "}
            <code>quantidade</code>. Cada linha substitui o saldo de estoque daquela variação —
            informe cor/tamanho/modelo exatamente como cadastrados no produto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="border-input hover:bg-accent flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-sm">
            <Upload className="size-5" />
            {nomeArquivo ?? "Selecionar arquivo CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleArquivo} />
          </label>

          {erroArquivo && <p className="text-destructive text-sm">{erroArquivo}</p>}

          {linhas.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {linhas.length} linha(s) prontas para importar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={linhas.length === 0 || importar.isPending}
            onClick={handleImportar}
          >
            {importar.isPending ? "Importando..." : `Importar ${linhas.length || ""} linha(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
