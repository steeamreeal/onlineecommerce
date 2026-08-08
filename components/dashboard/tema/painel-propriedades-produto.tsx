"use client";

import { X, AlignLeft, AlignCenter, AlignRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  NOMES_TIPO_SECAO_PRODUTO,
  NOMES_ICONE_SELO,
  iconeSeloSchema,
  type SecaoProdutoTema,
  type AlinhamentoTexto,
  type SeloProduto,
} from "@/lib/tema-loja";

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function CampoSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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

const OPCOES_ALINHAMENTO: { valor: AlinhamentoTexto; label: string; Icone: typeof AlignLeft }[] = [
  { valor: "ESQUERDA", label: "Início", Icone: AlignLeft },
  { valor: "CENTRO", label: "Centro", Icone: AlignCenter },
  { valor: "DIREITA", label: "Final", Icone: AlignRight },
];

function SeletorAlinhamento({
  value,
  onChange,
}: {
  value: AlinhamentoTexto;
  onChange: (valor: AlinhamentoTexto) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Alinhamento do texto</Label>
      <div className="grid grid-cols-3 gap-2">
        {OPCOES_ALINHAMENTO.map(({ valor, label, Icone }) => (
          <button
            key={valor}
            type="button"
            onClick={() => onChange(valor)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
              value === valor ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/40",
            )}
          >
            <Icone className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditorSelos({
  itens,
  onChange,
}: {
  itens: SeloProduto[];
  onChange: (itens: SeloProduto[]) => void;
}) {
  function adicionar() {
    if (itens.length >= 6) return;
    onChange([...itens, { id: crypto.randomUUID(), icone: "QUALIDADE", texto: "" }]);
  }

  function atualizar(id: string, alteracoes: Partial<SeloProduto>) {
    onChange(itens.map((s) => (s.id === id ? { ...s, ...alteracoes } : s)));
  }

  function remover(id: string) {
    onChange(itens.filter((s) => s.id !== id));
  }

  return (
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
        <div key={selo.id} className="flex items-center gap-2 rounded-md border p-2">
          <Select value={selo.icone} onValueChange={(v) => atualizar(selo.id, { icone: v as SeloProduto["icone"] })}>
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
            value={selo.texto}
            placeholder="Ex: Envio em 24h"
            className="flex-1"
            onChange={(e) => atualizar(selo.id, { texto: e.target.value })}
          />
          <button type="button" onClick={() => remover(selo.id)} aria-label="Remover selo">
            <Trash2 className="text-destructive size-4" />
          </button>
        </div>
      ))}
      {itens.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Nenhum selo ainda — ex: &quot;Entrega em 24h&quot;, &quot;Garantia de 30 dias&quot;.
        </p>
      )}
    </div>
  );
}

function FormularioSecao({
  secao,
  onChange,
}: {
  secao: SecaoProdutoTema;
  onChange: (secao: SecaoProdutoTema) => void;
}) {
  switch (secao.tipo) {
    case "GALERIA_PRODUTO":
      return (
        <div className="flex flex-col gap-4">
          <CampoSwitch
            label="Mostrar miniaturas abaixo da imagem principal"
            checked={secao.config.mostrarMiniaturas ?? true}
            onChange={(mostrarMiniaturas) => onChange({ ...secao, config: { ...secao.config, mostrarMiniaturas } })}
          />
        </div>
      );

    case "INFO_PRODUTO":
      return (
        <div className="flex flex-col gap-4">
          <CampoSwitch
            label="Mostrar caminho (Início / Categoria / Produto)"
            checked={secao.config.mostrarBreadcrumb ?? true}
            onChange={(mostrarBreadcrumb) => onChange({ ...secao, config: { ...secao.config, mostrarBreadcrumb } })}
          />
          <CampoSwitch
            label="Mostrar descrição curta abaixo do título"
            checked={secao.config.mostrarDescricaoCurta ?? true}
            onChange={(mostrarDescricaoCurta) =>
              onChange({ ...secao, config: { ...secao.config, mostrarDescricaoCurta } })
            }
          />
          <CampoTexto
            label="Texto do botão de comprar"
            value={secao.config.textoBotao}
            placeholder="Adicionar ao carrinho"
            onChange={(textoBotao) => onChange({ ...secao, config: { ...secao.config, textoBotao } })}
          />
          <CampoTexto
            label="Texto do botão quando esgotado"
            value={secao.config.textoBotaoEsgotado}
            placeholder="Produto esgotado"
            onChange={(textoBotaoEsgotado) => onChange({ ...secao, config: { ...secao.config, textoBotaoEsgotado } })}
          />
          <CampoCor
            label="Cor do botão"
            value={secao.config.corBotao}
            placeholder="#000000"
            onChange={(corBotao) => onChange({ ...secao, config: { ...secao.config, corBotao } })}
          />
          <CampoCor
            label="Cor do texto do botão"
            value={secao.config.corTextoBotao}
            placeholder="#ffffff"
            onChange={(corTextoBotao) => onChange({ ...secao, config: { ...secao.config, corTextoBotao } })}
          />
        </div>
      );

    case "DESCRICAO_PRODUTO":
      return (
        <div className="flex flex-col gap-4">
          <CampoTexto
            label="Título da seção"
            value={secao.config.titulo}
            placeholder="Descrição"
            onChange={(titulo) => onChange({ ...secao, config: { ...secao.config, titulo } })}
          />
          <p className="text-muted-foreground text-xs">
            O texto vem da descrição cadastrada em cada produto — essa seção só controla o título e
            se ela aparece.
          </p>
        </div>
      );

    case "SELOS_PRODUTO":
      return (
        <EditorSelos
          itens={secao.config.itens ?? []}
          onChange={(itens) => onChange({ ...secao, config: { ...secao.config, itens } })}
        />
      );

    case "TEXTO_PRODUTO":
      return (
        <div className="flex flex-col gap-4">
          <CampoTexto
            label="Título (opcional)"
            value={secao.config.titulo ?? ""}
            onChange={(titulo) => onChange({ ...secao, config: { ...secao.config, titulo } })}
          />
          <CampoTexto
            label="Texto"
            value={secao.config.corpo}
            multiline
            onChange={(corpo) => onChange({ ...secao, config: { ...secao.config, corpo } })}
          />
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "ESQUERDA"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
        </div>
      );

    case "RELACIONADOS_PRODUTO":
      return (
        <div className="flex flex-col gap-4">
          <CampoTexto
            label="Título da seção"
            value={secao.config.titulo}
            placeholder="Você também pode gostar"
            onChange={(titulo) => onChange({ ...secao, config: { ...secao.config, titulo } })}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Quantidade de produtos</Label>
              <span className="text-muted-foreground text-xs">{secao.config.quantidade ?? "Todos"}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={secao.config.quantidade ?? 20}
              onChange={(e) => {
                const valor = Number(e.target.value);
                onChange({ ...secao, config: { ...secao.config, quantidade: valor >= 20 ? undefined : valor } });
              }}
              className="accent-primary"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function PainelPropriedadesProduto({
  secaoSelecionada,
  onChangeSecao,
  onFechar,
}: {
  secaoSelecionada: SecaoProdutoTema | null;
  onChangeSecao: (secao: SecaoProdutoTema) => void;
  onFechar: () => void;
}) {
  if (!secaoSelecionada) {
    return (
      <aside className="text-muted-foreground flex w-[420px] shrink-0 items-center justify-center border-l p-6 text-center text-sm">
        Selecione uma seção na lista à esquerda para editar.
      </aside>
    );
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{NOMES_TIPO_SECAO_PRODUTO[secaoSelecionada.tipo]}</h2>
        <Button variant="ghost" size="icon" className="size-7" onClick={onFechar}>
          <X className="size-4" />
        </Button>
      </div>

      <FormularioSecao secao={secaoSelecionada} onChange={onChangeSecao} />
    </aside>
  );
}
