"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOMES_ICONE_SELO, iconeSeloSchema, type SeloProduto } from "@/lib/tema-loja";

// Config completa da seção Selos (itens + estilo) — mesmo shape usado tanto
// na home (secaoSelosSchema, tipo "SELOS") quanto na página de produto
// (secaoSelosProdutoSchema, tipo "SELOS_PRODUTO"), então este formulário é
// reaproveitado inteiro nos dois editores em vez de duplicado.
type ConfigSelos = {
  itens: SeloProduto[];
  corFundo?: string;
  corTexto?: string;
  corTitulo?: string;
  corIcone?: string;
  tamanhoIcone?: number;
  tamanhoTitulo?: number;
};

function CampoCor({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onChange: (valor: string | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-md border"
        />
        <Input
          value={value ?? ""}
          placeholder="Padrão do tema"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </div>
    </div>
  );
}

function SeletorEscala({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number | undefined;
  onChange: (valor: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-muted-foreground text-xs">{valor ?? "Padrão"}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={valor ?? 30}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </div>
  );
}

export function FormularioSelos({
  config,
  onChange,
}: {
  config: ConfigSelos;
  onChange: (config: ConfigSelos) => void;
}) {
  const itens = config.itens ?? [];

  function adicionar() {
    if (itens.length >= 6) return;
    onChange({ ...config, itens: [...itens, { id: crypto.randomUUID(), icone: "QUALIDADE", titulo: "" }] });
  }

  function atualizar(id: string, alteracoes: Partial<SeloProduto>) {
    onChange({ ...config, itens: itens.map((s) => (s.id === id ? { ...s, ...alteracoes } : s)) });
  }

  function remover(id: string) {
    onChange({ ...config, itens: itens.filter((s) => s.id !== id) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Selos ({itens.length}/6)</Label>
          {itens.length < 6 && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={adicionar} aria-label="Adicionar selo">
              <Plus className="size-4" />
            </Button>
          )}
        </div>
        {itens.map((selo) => (
          <div key={selo.id} className="flex flex-col gap-2 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <Select
                value={selo.icone}
                onValueChange={(v) => atualizar(selo.id, { icone: v as SeloProduto["icone"] })}
              >
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconeSeloSchema.options.map((icone) => (
                    <SelectItem key={icone} value={icone}>
                      {NOMES_ICONE_SELO[icone]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={selo.titulo}
                placeholder="Título — ex: Troca fácil"
                className="flex-1"
                onChange={(e) => atualizar(selo.id, { titulo: e.target.value })}
              />
              <button type="button" onClick={() => remover(selo.id)} aria-label="Remover selo">
                <Trash2 className="text-destructive size-4" />
              </button>
            </div>
            <Input
              value={selo.descricao ?? ""}
              placeholder="Descrição (opcional) — ex: Não serviu? Trocamos grátis em 30 dias."
              onChange={(e) => atualizar(selo.id, { descricao: e.target.value || undefined })}
            />
          </div>
        ))}
        {itens.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Nenhum selo ainda — ex: &quot;Parcelamento&quot;, &quot;Troca fácil&quot;, &quot;Entrega&quot;.
          </p>
        )}
      </div>

      <SeletorEscala
        label="Tamanho do ícone"
        valor={config.tamanhoIcone}
        onChange={(tamanhoIcone) => onChange({ ...config, tamanhoIcone })}
      />
      <SeletorEscala
        label="Tamanho do título"
        valor={config.tamanhoTitulo}
        onChange={(tamanhoTitulo) => onChange({ ...config, tamanhoTitulo })}
      />
      <CampoCor
        label="Cor de fundo"
        value={config.corFundo}
        placeholder="#1c1917"
        onChange={(corFundo) => onChange({ ...config, corFundo })}
      />
      <CampoCor
        label="Cor do ícone"
        value={config.corIcone}
        placeholder="#ffffff"
        onChange={(corIcone) => onChange({ ...config, corIcone })}
      />
      <CampoCor
        label="Cor do título"
        value={config.corTitulo}
        placeholder="#ffffff"
        onChange={(corTitulo) => onChange({ ...config, corTitulo })}
      />
      <CampoCor
        label="Cor da descrição"
        value={config.corTexto}
        placeholder="#ffffff"
        onChange={(corTexto) => onChange({ ...config, corTexto })}
      />
    </div>
  );
}
