"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type TemplateLoja = RouterOutputs["loja"]["atualizarPersonalizacao"]["template"];

const templates: { id: TemplateLoja; nome: string; descricao: string }[] = [
  { id: "MINIMALISTA", nome: "Minimalista", descricao: "Espaço em branco, foco no produto." },
  { id: "EDITORIAL", nome: "Editorial", descricao: "Tipografia serifada, ar de boutique." },
  { id: "VITRINE", nome: "Vitrine", descricao: "Cores fortes, grid grande, bem chamativo." },
];

function Miniatura({ id }: { id: TemplateLoja }) {
  if (id === "MINIMALISTA") {
    return (
      <div className="flex h-full flex-col gap-1 rounded-sm bg-white p-2">
        <div className="h-3 w-1/3 rounded-sm bg-neutral-200" />
        <div className="grid flex-1 grid-cols-3 gap-1">
          <div className="rounded-sm bg-neutral-100" />
          <div className="rounded-sm bg-neutral-100" />
          <div className="rounded-sm bg-neutral-100" />
        </div>
      </div>
    );
  }
  if (id === "VITRINE") {
    return (
      <div className="flex h-full flex-col gap-1 rounded-sm bg-white p-2">
        <div className="bg-primary h-4 rounded-sm" />
        <div className="grid flex-1 grid-cols-2 gap-1">
          <div className="border-primary/40 rounded-sm border-2 bg-neutral-100" />
          <div className="border-primary/40 rounded-sm border-2 bg-neutral-100" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center gap-1 rounded-sm bg-white p-2">
      <div className="h-4 w-2/3 rounded-sm bg-neutral-200" />
      <div className="grid flex-1 grid-cols-2 gap-2">
        <div className="rounded-sm bg-neutral-100" />
        <div className="rounded-sm bg-neutral-100" />
      </div>
    </div>
  );
}

export function TemplateLojaForm() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateLoja | null>(null);

  const salvar = trpc.loja.atualizarPersonalizacao.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Template da loja atualizado.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar o template.");
    },
  });

  const templateAtual = templateSelecionado ?? loja?.template ?? "MINIMALISTA";
  const corPrimaria = loja?.corPrimaria ?? "#EA580C";

  function escolher(template: TemplateLoja) {
    setTemplateSelecionado(template);
    salvar.mutate({ template, corPrimaria });
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          disabled={isLoading || salvar.isPending}
          onClick={() => escolher(template.id)}
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-3 text-left shadow-sm transition-colors",
            templateAtual === template.id ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/40",
          )}
        >
          <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md">
            <Miniatura id={template.id} />
          </div>
          <div>
            <p className="text-sm font-medium">{template.nome}</p>
            <p className="text-muted-foreground text-xs">{template.descricao}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
