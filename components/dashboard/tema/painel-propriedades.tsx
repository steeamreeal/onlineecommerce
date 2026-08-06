"use client";

import { useState } from "react";
import { X, Upload, AlignLeft, AlignCenter, AlignRight, Plus, Trash2 } from "lucide-react";
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
import { trpc } from "@/lib/trpc/client";
import { enviarBannerLoja, enviarVideoBannerLoja } from "@/lib/supabase/storage";
import { CORES_PRIMARIAS_SUGERIDAS } from "@/lib/cores-loja";
import {
  NOMES_TIPO_SECAO,
  NOMES_FONTE,
  NOMES_TAMANHO_TEXTO,
  FONTES_TEMA,
  type SecaoTema,
  type EstiloTema,
  type BannerTema,
  type AlinhamentoTexto,
  type ColunaRodape,
  type TamanhoTexto,
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

function EditorColunasRodape({
  colunas,
  onChange,
}: {
  colunas: ColunaRodape[];
  onChange: (colunas: ColunaRodape[]) => void;
}) {
  function adicionarColuna() {
    if (colunas.length >= 4) return;
    onChange([...colunas, { id: crypto.randomUUID(), titulo: "Nova coluna", links: [] }]);
  }

  function atualizarColuna(id: string, coluna: ColunaRodape) {
    onChange(colunas.map((c) => (c.id === id ? coluna : c)));
  }

  function removerColuna(id: string) {
    onChange(colunas.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Colunas de links ({colunas.length}/4)</Label>
        {colunas.length < 4 && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={adicionarColuna} aria-label="Adicionar coluna">
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {colunas.map((coluna) => (
        <div key={coluna.id} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={coluna.titulo}
              placeholder="Título da coluna"
              onChange={(e) => atualizarColuna(coluna.id, { ...coluna, titulo: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removerColuna(coluna.id)}
              aria-label="Remover coluna"
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5 pl-1">
            {coluna.links.map((link) => (
              <div key={link.id} className="flex items-center gap-1.5">
                <Input
                  value={link.texto}
                  placeholder="Texto"
                  className="flex-1"
                  onChange={(e) =>
                    atualizarColuna(coluna.id, {
                      ...coluna,
                      links: coluna.links.map((l) =>
                        l.id === link.id ? { ...l, texto: e.target.value } : l,
                      ),
                    })
                  }
                />
                <Input
                  value={link.url}
                  placeholder="URL"
                  className="flex-1"
                  onChange={(e) =>
                    atualizarColuna(coluna.id, {
                      ...coluna,
                      links: coluna.links.map((l) =>
                        l.id === link.id ? { ...l, url: e.target.value } : l,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    atualizarColuna(coluna.id, {
                      ...coluna,
                      links: coluna.links.filter((l) => l.id !== link.id),
                    })
                  }
                  aria-label="Remover link"
                >
                  <X className="text-muted-foreground size-3.5" />
                </button>
              </div>
            ))}
            {coluna.links.length < 8 && (
              <button
                type="button"
                onClick={() =>
                  atualizarColuna(coluna.id, {
                    ...coluna,
                    links: [...coluna.links, { id: crypto.randomUUID(), texto: "", url: "" }],
                  })
                }
                className="text-primary flex items-center gap-1 text-left text-xs hover:underline"
              >
                <Plus className="size-3" />
                Adicionar link
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditorBannersHero({
  lojaId,
  banners,
  onChange,
}: {
  lojaId: string | undefined;
  banners: BannerTema[];
  onChange: (banners: BannerTema[]) => void;
}) {
  const [enviando, setEnviando] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !lojaId) return;

    setEnviando(true);
    try {
      const ehVideo = arquivo.type.startsWith("video/");
      const url = ehVideo
        ? await enviarVideoBannerLoja(lojaId, arquivo)
        : await enviarBannerLoja(lojaId, arquivo);
      onChange([...banners, { url, titulo: "", tipo: ehVideo ? "VIDEO" : "IMAGEM" }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Imagens/vídeos ({banners.length}/3)</Label>
      <div className="flex flex-col gap-3">
        {banners.map((banner, i) => (
          <div key={banner.id ?? banner.url} className="flex items-start gap-2">
            <div className="relative shrink-0">
              {banner.tipo === "VIDEO" ? (
                <video src={banner.url} className="aspect-[3/1] w-32 rounded-md border object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage
                <img src={banner.url} alt="" className="aspect-[3/1] w-32 rounded-md border object-cover" />
              )}
              <button
                type="button"
                onClick={() => onChange(banners.filter((_, idx) => idx !== i))}
                className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </div>
            <Input
              value={banner.link ?? ""}
              placeholder="Link ao clicar (ex: /loja/minha-loja/produtos)"
              className="flex-1"
              onChange={(e) =>
                onChange(banners.map((b, idx) => (idx === i ? { ...b, link: e.target.value } : b)))
              }
            />
          </div>
        ))}
        {banners.length < 3 && (
          <label className="border-input hover:bg-accent flex aspect-[3/1] w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] has-disabled:pointer-events-none has-disabled:opacity-50">
            <Upload className="size-3" />
            {enviando ? "Enviando..." : "Adicionar"}
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              disabled={enviando || !lojaId}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function FormularioSecao({
  secao,
  lojaId,
  logoUrl,
  categorias,
  onChange,
}: {
  secao: SecaoTema;
  lojaId: string | undefined;
  logoUrl: string | null | undefined;
  categorias: { id: string; nome: string }[];
  onChange: (secao: SecaoTema) => void;
}) {
  switch (secao.tipo) {
    case "BARRA_ANUNCIO":
      return (
        <CampoTexto
          label="Texto do anúncio"
          value={secao.config.texto}
          placeholder="Frete grátis acima de R$ 200"
          onChange={(texto) => onChange({ ...secao, config: { texto } })}
        />
      );

    case "CABECALHO":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Exibir no cabeçalho</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["NOME", "LOGO"] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => onChange({ ...secao, config: { ...secao.config, exibicaoLogo: opcao } })}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    secao.config.exibicaoLogo === opcao
                      ? "border-primary ring-primary/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  {opcao === "NOME" ? "Nome da loja" : "Logo"}
                </button>
              ))}
            </div>
            {secao.config.exibicaoLogo === "LOGO" && !logoUrl && (
              <p className="text-muted-foreground text-xs">
                Nenhuma logo cadastrada ainda — envie uma em Configurações → Loja. Até lá, o nome
                da loja continua aparecendo no lugar.
              </p>
            )}
          </div>
          {secao.config.exibicaoLogo === "LOGO" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Tamanho da logo</Label>
                <span className="text-muted-foreground text-xs">{secao.config.tamanhoLogo ?? 40}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={secao.config.tamanhoLogo ?? 40}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, tamanhoLogo: Number(e.target.value) } })
                }
                className="accent-primary"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Posição da logo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ESQUERDA", "CENTRO"] as const).map((posicao) => (
                <button
                  key={posicao}
                  type="button"
                  onClick={() => onChange({ ...secao, config: { ...secao.config, posicaoLogo: posicao } })}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    secao.config.posicaoLogo === posicao
                      ? "border-primary ring-primary/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  {posicao === "ESQUERDA" ? "Esquerda" : "Centro"}
                </button>
              ))}
            </div>
          </div>
          <CampoSwitch
            label="Mostrar busca no cabeçalho"
            checked={secao.config.mostrarBusca}
            onChange={(mostrarBusca) => onChange({ ...secao, config: { ...secao.config, mostrarBusca } })}
          />
          <CampoSwitch
            label="Mostrar ícone de conta"
            checked={secao.config.mostrarConta}
            onChange={(mostrarConta) => onChange({ ...secao, config: { ...secao.config, mostrarConta } })}
          />
        </div>
      );

    case "HERO":
      return (
        <div className="flex flex-col gap-4">
          <EditorBannersHero
            lojaId={lojaId}
            banners={secao.config.banners}
            onChange={(banners) => onChange({ ...secao, config: { ...secao.config, banners } })}
          />
          <CampoTexto
            label="Título (opcional)"
            value={secao.config.titulo ?? ""}
            placeholder="Browse our latest products"
            onChange={(titulo) => onChange({ ...secao, config: { ...secao.config, titulo } })}
          />
          <CampoTexto
            label="Texto do botão (opcional)"
            value={secao.config.textoBotao ?? ""}
            placeholder="Ver produtos"
            onChange={(textoBotao) => onChange({ ...secao, config: { ...secao.config, textoBotao } })}
          />
          <CampoTexto
            label="Link do botão (opcional)"
            value={secao.config.linkBotao ?? ""}
            placeholder="/loja/minha-loja/produtos"
            onChange={(linkBotao) => onChange({ ...secao, config: { ...secao.config, linkBotao } })}
          />
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "ESQUERDA"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
          <CampoSwitch
            label="Colado no cabeçalho (sem espaço acima)"
            checked={secao.config.coladoNoCabecalho ?? false}
            onChange={(coladoNoCabecalho) =>
              onChange({ ...secao, config: { ...secao.config, coladoNoCabecalho } })
            }
          />
        </div>
      );

    case "MENU_CATEGORIAS":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Cor do texto (opcional)</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.cor ?? "#000000"}
                onChange={(e) => onChange({ ...secao, config: { ...secao.config, cor: e.target.value } })}
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.cor ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, cor: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tamanho do texto</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["PEQUENO", "MEDIO", "GRANDE"] as TamanhoTexto[]).map((tamanho) => (
                <button
                  key={tamanho}
                  type="button"
                  onClick={() => onChange({ ...secao, config: { ...secao.config, tamanho } })}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    (secao.config.tamanho ?? "MEDIO") === tamanho
                      ? "border-primary ring-primary/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  {NOMES_TAMANHO_TEXTO[tamanho]}
                </button>
              ))}
            </div>
          </div>
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "ESQUERDA"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
        </div>
      );

    case "COLECAO_DESTAQUE":
      return (
        <div className="flex flex-col gap-4">
          <CampoTexto
            label="Título da seção"
            value={secao.config.titulo}
            onChange={(titulo) => onChange({ ...secao, config: { ...secao.config, titulo } })}
          />
          <div className="flex flex-col gap-2">
            <Label>Categoria (opcional — vazio mostra os destaques automáticos)</Label>
            <Select
              value={secao.config.categoriaId ?? "_todas"}
              onValueChange={(v) =>
                onChange({
                  ...secao,
                  config: { ...secao.config, categoriaId: !v || v === "_todas" ? undefined : v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_todas">Todos os destaques</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CampoSwitch
            label='Mostrar link "Ver tudo"'
            checked={secao.config.linkVerTudo}
            onChange={(linkVerTudo) => onChange({ ...secao, config: { ...secao.config, linkVerTudo } })}
          />
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "ESQUERDA"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
        </div>
      );

    case "TEXTO":
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

    case "RODAPE":
      return (
        <div className="flex flex-col gap-4">
          <CampoSwitch
            label="Mostrar redes sociais"
            checked={secao.config.mostrarRedesSociais}
            onChange={(mostrarRedesSociais) =>
              onChange({ ...secao, config: { ...secao.config, mostrarRedesSociais } })
            }
          />
          <CampoSwitch
            label="Mostrar políticas da loja"
            checked={secao.config.mostrarPoliticas}
            onChange={(mostrarPoliticas) =>
              onChange({ ...secao, config: { ...secao.config, mostrarPoliticas } })
            }
          />
          <CampoSwitch
            label="Mostrar newsletter"
            checked={secao.config.mostrarNewsletter}
            onChange={(mostrarNewsletter) =>
              onChange({ ...secao, config: { ...secao.config, mostrarNewsletter } })
            }
          />
          <CampoSwitch
            label="Mostrar formas de pagamento"
            checked={secao.config.mostrarFormasPagamento}
            onChange={(mostrarFormasPagamento) =>
              onChange({ ...secao, config: { ...secao.config, mostrarFormasPagamento } })
            }
          />
          {secao.config.mostrarFormasPagamento && (
            <p className="text-muted-foreground text-xs">
              Os ícones são apenas ilustrativos. As formas de pagamento realmente aceitas no
              checkout dependem da conta Mercado Pago conectada em Configurações → Assinatura.
            </p>
          )}
          <EditorColunasRodape
            colunas={secao.config.colunas ?? []}
            onChange={(colunas) => onChange({ ...secao, config: { ...secao.config, colunas } })}
          />
        </div>
      );

    default:
      return null;
  }
}

function FormularioEstilo({
  estilo,
  template,
  onChangeEstilo,
  onChangeTemplate,
}: {
  estilo: EstiloTema;
  template: "MINIMALISTA" | "EDITORIAL" | "VITRINE";
  onChangeEstilo: (estilo: EstiloTema) => void;
  onChangeTemplate: (template: "MINIMALISTA" | "EDITORIAL" | "VITRINE") => void;
}) {
  const templates: { id: "MINIMALISTA" | "EDITORIAL" | "VITRINE"; nome: string }[] = [
    { id: "MINIMALISTA", nome: "Minimalista" },
    { id: "EDITORIAL", nome: "Editorial" },
    { id: "VITRINE", nome: "Vitrine" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Template</Label>
        <div className="grid grid-cols-3 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTemplate(t.id)}
              className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                template === t.id ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/40"
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor primária</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={estilo.corPrimaria}
            onChange={(e) => onChangeEstilo({ ...estilo, corPrimaria: e.target.value })}
            className="h-9 w-12 rounded-md border"
          />
          <Input
            value={estilo.corPrimaria}
            onChange={(e) => onChangeEstilo({ ...estilo, corPrimaria: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CORES_PRIMARIAS_SUGERIDAS.map((cor) => (
            <button
              key={cor.hex}
              type="button"
              title={cor.nome}
              onClick={() => onChangeEstilo({ ...estilo, corPrimaria: cor.hex })}
              style={{ backgroundColor: cor.hex }}
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                estilo.corPrimaria.toLowerCase() === cor.hex.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Fonte dos títulos</Label>
        <Select
          value={estilo.fonteTitulo}
          onValueChange={(v) => onChangeEstilo({ ...estilo, fonteTitulo: v as EstiloTema["fonteTitulo"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTES_TEMA.map((f) => (
              <SelectItem key={f} value={f}>
                {NOMES_FONTE[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Fonte do corpo de texto</Label>
        <Select
          value={estilo.fonteCorpo}
          onValueChange={(v) => onChangeEstilo({ ...estilo, fonteCorpo: v as EstiloTema["fonteCorpo"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTES_TEMA.map((f) => (
              <SelectItem key={f} value={f}>
                {NOMES_FONTE[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PainelPropriedades({
  secaoSelecionada,
  mostrandoEstilo,
  estilo,
  template,
  categorias,
  onChangeSecao,
  onChangeEstilo,
  onChangeTemplate,
  onFechar,
}: {
  secaoSelecionada: SecaoTema | null;
  mostrandoEstilo: boolean;
  estilo: EstiloTema;
  template: "MINIMALISTA" | "EDITORIAL" | "VITRINE";
  categorias: { id: string; nome: string }[];
  onChangeSecao: (secao: SecaoTema) => void;
  onChangeEstilo: (estilo: EstiloTema) => void;
  onChangeTemplate: (template: "MINIMALISTA" | "EDITORIAL" | "VITRINE") => void;
  onFechar: () => void;
}) {
  const { data: loja } = trpc.loja.atual.useQuery();

  if (!mostrandoEstilo && !secaoSelecionada) {
    return (
      <aside className="text-muted-foreground flex w-80 shrink-0 items-center justify-center border-l p-6 text-center text-sm">
        Selecione uma seção no preview ou na lista à esquerda para editar.
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {mostrandoEstilo ? "Configurações do tema" : NOMES_TIPO_SECAO[secaoSelecionada!.tipo]}
        </h2>
        <Button variant="ghost" size="icon" className="size-7" onClick={onFechar}>
          <X className="size-4" />
        </Button>
      </div>

      {mostrandoEstilo ? (
        <FormularioEstilo
          estilo={estilo}
          template={template}
          onChangeEstilo={onChangeEstilo}
          onChangeTemplate={onChangeTemplate}
        />
      ) : (
        <FormularioSecao
          secao={secaoSelecionada!}
          lojaId={loja?.id}
          logoUrl={loja?.logoUrl}
          categorias={categorias}
          onChange={onChangeSecao}
        />
      )}
    </aside>
  );
}
