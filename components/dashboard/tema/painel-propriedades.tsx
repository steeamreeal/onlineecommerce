"use client";

import { useRef, useState } from "react";
import {
  X,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Monitor,
  Smartphone,
} from "lucide-react";
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
import { FormularioSelos } from "@/components/dashboard/tema/editor-selos";
import {
  NOMES_TIPO_SECAO,
  NOMES_FONTE,
  NOMES_TAMANHO_TEXTO,
  NOMES_EXIBIR_EM,
  FONTES_TEMA,
  type SecaoTema,
  type EstiloTema,
  type BannerTema,
  type AlinhamentoTexto,
  type PosicaoVertical,
  type ColunaRodape,
  type TamanhoTexto,
  type ExibirEm,
  type FonteTema,
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

// Sem valor (undefined) = "Seguir texto", o botão herda o alinhamento do
// título. Com um valor explícito, o botão ganha posição própria — útil
// quando o título é comprido e o botão "seguindo" o texto fica torto.
function SeletorAlinhamentoBotao({
  value,
  onChange,
}: {
  value: AlinhamentoTexto | undefined;
  onChange: (valor: AlinhamentoTexto | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Alinhamento do botão</Label>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
            value === undefined ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/40",
          )}
        >
          Seguir texto
        </button>
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

const LINHAS_POSICAO: PosicaoVertical[] = ["INICIO", "CENTRO", "FIM"];
const COLUNAS_POSICAO: AlinhamentoTexto[] = ["ESQUERDA", "CENTRO", "DIREITA"];

// Nove pontos de ancoragem do conteúdo (título/botão) sobre a imagem do
// banner — combina os dois eixos independentes já existentes no schema
// (alinhamentoHorizontal x alinhamentoVertical) numa única grade de cliques,
// em vez de dois seletores separados. Alternativa: "Arrastar", posição
// livre em % (x,y) — arrasta um marcador dentro da miniatura do banner.
function SeletorPosicaoConteudo({
  horizontal,
  vertical,
  posicaoLivre,
  onChange,
  onChangeLivre,
}: {
  horizontal: AlinhamentoTexto;
  vertical: PosicaoVertical;
  posicaoLivre: { x: number; y: number } | undefined;
  onChange: (valor: { horizontal: AlinhamentoTexto; vertical: PosicaoVertical }) => void;
  onChangeLivre: (valor: { x: number; y: number } | undefined) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const modo = posicaoLivre ? "LIVRE" : "GRADE";

  function calcularPosicao(e: { clientX: number; clientY: number }) {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    onChangeLivre({ x: Math.round(x), y: Math.round(y) });
  }

  function iniciarArrasto(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    calcularPosicao(e);
  }

  function arrastando(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    calcularPosicao(e);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Onde o texto aparece sobre a imagem</Label>
        <div className="bg-muted flex items-center gap-0.5 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onChangeLivre(undefined)}
            className={cn(
              "rounded-sm px-2 py-1 text-xs font-medium transition-colors",
              modo === "GRADE" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            Grade
          </button>
          <button
            type="button"
            onClick={() => onChangeLivre(posicaoLivre ?? { x: 50, y: 85 })}
            className={cn(
              "rounded-sm px-2 py-1 text-xs font-medium transition-colors",
              modo === "LIVRE" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            Arrastar
          </button>
        </div>
      </div>

      {modo === "GRADE" ? (
        <div className="bg-muted grid aspect-video grid-cols-3 gap-1.5 rounded-md p-1.5">
          {LINHAS_POSICAO.map((linha) =>
            COLUNAS_POSICAO.map((coluna) => {
              const ativo = linha === vertical && coluna === horizontal;
              return (
                <button
                  key={`${linha}-${coluna}`}
                  type="button"
                  aria-label={`Posicionar em ${linha === "INICIO" ? "cima" : linha === "CENTRO" ? "meio" : "baixo"}, ${coluna === "ESQUERDA" ? "esquerda" : coluna === "CENTRO" ? "centro" : "direita"}`}
                  onClick={() => onChange({ horizontal: coluna, vertical: linha })}
                  className={cn(
                    "bg-background flex items-center justify-center rounded-sm border transition-colors",
                    ativo ? "border-primary ring-primary/30 ring-2" : "hover:border-primary/40",
                  )}
                >
                  <span className={cn("size-2 rounded-full", ativo ? "bg-primary" : "bg-muted-foreground/40")} />
                </button>
              );
            }),
          )}
        </div>
      ) : (
        <>
          <div
            ref={areaRef}
            onPointerDown={iniciarArrasto}
            onPointerMove={arrastando}
            className="bg-muted relative aspect-video cursor-crosshair touch-none rounded-md"
          >
            <div
              className="border-background bg-primary absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
              style={{ left: `${posicaoLivre?.x ?? 50}%`, top: `${posicaoLivre?.y ?? 85}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">Arraste o círculo para posicionar livremente.</p>
        </>
      )}
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

function SeletorProdutosCategoria({
  categoriaId,
  produtosSelecionados,
  onChange,
}: {
  categoriaId: string;
  produtosSelecionados: string[] | undefined;
  onChange: (produtosSelecionados: string[] | undefined) => void;
}) {
  const { data: produtos, isLoading } = trpc.produtos.listar.useQuery({ categoriaId });
  const selecionados = produtosSelecionados ?? [];

  function alternar(id: string) {
    const proximos = selecionados.includes(id)
      ? selecionados.filter((p) => p !== id)
      : [...selecionados, id];
    onChange(proximos.length > 0 ? proximos : undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>
        Produtos desta categoria{" "}
        <span className="font-normal">
          (opcional — vazio mostra os destaques automáticos da categoria)
        </span>
      </Label>
      {isLoading ? (
        <p className="text-muted-foreground text-xs">Carregando produtos...</p>
      ) : !produtos || produtos.length === 0 ? (
        <p className="text-muted-foreground text-xs">Nenhum produto cadastrado nessa categoria.</p>
      ) : (
        <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-2">
          {produtos.map((produto) => {
            const foto = produto.fotos.find((f) => f.tipo === "IMAGEM");
            return (
              <label
                key={produto.id}
                className="hover:bg-accent flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selecionados.includes(produto.id)}
                  onChange={() => alternar(produto.id)}
                  className="accent-primary"
                />
                <span className="bg-muted size-8 shrink-0 overflow-hidden rounded-sm">
                  {foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto.url} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="truncate">{produto.nome}</span>
              </label>
            );
          })}
        </div>
      )}
      {selecionados.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {selecionados.length} produto{selecionados.length > 1 ? "s" : ""} selecionado
          {selecionados.length > 1 ? "s" : ""}, na ordem marcada.
        </p>
      )}
    </div>
  );
}

function SeletorFonteTamanho({
  label,
  fonte,
  tamanho,
  onChangeFonte,
  onChangeTamanho,
}: {
  label: string;
  fonte: FonteTema | undefined;
  tamanho: number | undefined;
  onChangeFonte: (fonte: FonteTema | undefined) => void;
  onChangeTamanho: (tamanho: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <Label className="text-xs">{label}</Label>
      <Select value={fonte ?? "_padrao"} onValueChange={(v) => onChangeFonte(v === "_padrao" ? undefined : (v as FonteTema))}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_padrao">Padrão do tema</SelectItem>
          {FONTES_TEMA.map((f) => (
            <SelectItem key={f} value={f}>
              {NOMES_FONTE[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Tamanho da fonte</span>
        <span className="text-muted-foreground text-xs">{tamanho ?? "Padrão"}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={tamanho ?? 40}
        onChange={(e) => onChangeTamanho(Number(e.target.value))}
        className="accent-primary"
      />
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
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground text-xs">{valor ?? "Padrão"}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={valor ?? 40}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
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
  const [enviandoMobileIndex, setEnviandoMobileIndex] = useState<number | null>(null);
  // Qual versão (desktop/mobile) do estilo do conteúdo está sendo editada
  // em cada banner — chave por id/url porque o índice muda se um banner do
  // meio for removido.
  const [viewportEstilo, setViewportEstilo] = useState<Record<string, "DESKTOP" | "MOBILE">>({});

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

  function atualizarBanner(i: number, alteracoes: Partial<BannerTema>) {
    onChange(banners.map((b, idx) => (idx === i ? { ...b, ...alteracoes } : b)));
  }

  // Estilo/posição do conteúdo mobile fica em banner.mobile — cada campo
  // não definido ali cai no valor do desktop (ver resolverConteudoBannerMobile).
  function atualizarBannerMobile(i: number, alteracoes: Partial<NonNullable<BannerTema["mobile"]>>) {
    const banner = banners[i];
    atualizarBanner(i, { mobile: { ...banner.mobile, ...alteracoes } });
  }

  async function handleUploadMobile(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !lojaId) return;

    setEnviandoMobileIndex(i);
    try {
      const ehVideo = arquivo.type.startsWith("video/");
      const url = ehVideo
        ? await enviarVideoBannerLoja(lojaId, arquivo)
        : await enviarBannerLoja(lojaId, arquivo);
      atualizarBanner(i, { urlMobile: url, tipoMobile: ehVideo ? "VIDEO" : "IMAGEM" });
    } finally {
      setEnviandoMobileIndex(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Imagens/vídeos ({banners.length}/3)</Label>
      <div className="flex flex-col gap-4">
        {banners.map((banner, i) => (
          <div key={banner.id ?? banner.url} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">Desktop</p>
              <div className="relative">
                {banner.tipo === "VIDEO" ? (
                  <video src={banner.url} className="aspect-[3/1] w-full rounded-md border object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage
                  <img src={banner.url} alt="" className="aspect-[3/1] w-full rounded-md border object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => onChange(banners.filter((_, idx) => idx !== i))}
                  className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 rounded-full p-1"
                  aria-label="Remover banner"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">
                Mobile <span className="font-normal">(opcional)</span>
              </p>
              {banner.urlMobile ? (
                <div className="relative w-32">
                  {banner.tipoMobile === "VIDEO" ? (
                    <video src={banner.urlMobile} className="aspect-[4/5] w-full rounded-md border object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage
                    <img src={banner.urlMobile} alt="" className="aspect-[4/5] w-full rounded-md border object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => atualizarBanner(i, { urlMobile: undefined, tipoMobile: undefined })}
                    className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 rounded-full p-1"
                    aria-label="Remover versão mobile"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border-input hover:bg-accent flex aspect-[4/5] w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] has-disabled:pointer-events-none has-disabled:opacity-50">
                  <Upload className="size-4" />
                  {enviandoMobileIndex === i ? "Enviando..." : "Adicionar"}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    disabled={enviandoMobileIndex !== null || !lojaId}
                    onChange={(e) => handleUploadMobile(i, e)}
                  />
                </label>
              )}
              <p className="text-muted-foreground text-xs">
                Conteúdo exclusivo deste banner — não aparece nos outros. Sem imagem mobile, usa a
                de desktop também no celular.
              </p>
            </div>

            <Input
              value={banner.link ?? ""}
              placeholder="Link ao clicar na imagem (ex: /loja/minha-loja/produtos)"
              onChange={(e) => atualizarBanner(i, { link: e.target.value })}
            />

            <Input
              value={banner.titulo}
              placeholder="Título sobre a imagem (opcional)"
              onChange={(e) => atualizarBanner(i, { titulo: e.target.value })}
            />

            <Input
              value={banner.textoBotao ?? ""}
              placeholder="Texto do botão (opcional)"
              onChange={(e) => atualizarBanner(i, { textoBotao: e.target.value })}
            />

            <Input
              value={banner.linkBotao ?? ""}
              placeholder="Link do botão (opcional)"
              onChange={(e) => atualizarBanner(i, { linkBotao: e.target.value })}
            />

            {(banner.titulo || banner.textoBotao) &&
              (() => {
                const chave = banner.id ?? banner.url;
                const tab = viewportEstilo[chave] ?? "DESKTOP";
                const noMobile = tab === "MOBILE";
                const m = banner.mobile;
                const escrever = (alteracoes: Partial<NonNullable<BannerTema["mobile"]>>) =>
                  noMobile ? atualizarBannerMobile(i, alteracoes) : atualizarBanner(i, alteracoes);

                return (
                  <div className="flex flex-col gap-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Estilo e posição do conteúdo</Label>
                      <div className="bg-muted flex items-center gap-0.5 rounded-md p-0.5">
                        <button
                          type="button"
                          aria-label="Editar estilo para desktop"
                          onClick={() => setViewportEstilo((atual) => ({ ...atual, [chave]: "DESKTOP" }))}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-sm transition-colors",
                            !noMobile ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Monitor className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Editar estilo para mobile"
                          onClick={() => setViewportEstilo((atual) => ({ ...atual, [chave]: "MOBILE" }))}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-sm transition-colors",
                            noMobile ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Smartphone className="size-4" />
                        </button>
                      </div>
                    </div>

                    {noMobile && (
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-xs">
                          Campo não mexido aqui usa o mesmo valor do desktop.
                        </p>
                        {m && Object.keys(m).length > 0 && (
                          <button
                            type="button"
                            onClick={() => atualizarBanner(i, { mobile: undefined })}
                            className="text-primary shrink-0 text-xs hover:underline"
                          >
                            Restaurar padrão
                          </button>
                        )}
                      </div>
                    )}

                    {banner.titulo && (
                      <SeletorFonteTamanho
                        label="Fonte e tamanho do título"
                        fonte={noMobile ? m?.fonteTitulo : banner.fonteTitulo}
                        tamanho={noMobile ? m?.tamanhoTitulo : banner.tamanhoTitulo}
                        onChangeFonte={(fonteTitulo) => escrever({ fonteTitulo })}
                        onChangeTamanho={(tamanhoTitulo) => escrever({ tamanhoTitulo })}
                      />
                    )}

                    {banner.textoBotao && (
                      <>
                        <SeletorAlinhamentoBotao
                          value={noMobile ? m?.alinhamentoBotao : banner.alinhamentoBotao}
                          onChange={(alinhamentoBotao) => escrever({ alinhamentoBotao })}
                        />
                        <SeletorFonteTamanho
                          label="Fonte e tamanho do texto do botão"
                          fonte={noMobile ? m?.fonteBotao : banner.fonteBotao}
                          tamanho={noMobile ? m?.tamanhoFonteBotao : banner.tamanhoFonteBotao}
                          onChangeFonte={(fonteBotao) => escrever({ fonteBotao })}
                          onChangeTamanho={(tamanhoFonteBotao) => escrever({ tamanhoFonteBotao })}
                        />
                        <SeletorEscala
                          label="Tamanho do botão"
                          valor={noMobile ? m?.tamanhoBotao : banner.tamanhoBotao}
                          onChange={(tamanhoBotao) => escrever({ tamanhoBotao })}
                        />
                        <SeletorEscala
                          label="Arredondamento do botão"
                          valor={noMobile ? m?.arredondamentoBotao : banner.arredondamentoBotao}
                          onChange={(arredondamentoBotao) => escrever({ arredondamentoBotao })}
                        />
                      </>
                    )}

                    <CampoSwitch
                      label="Mostrar fundo atrás do texto"
                      checked={(noMobile ? m?.mostrarFundo : banner.mostrarFundo) ?? banner.mostrarFundo ?? true}
                      onChange={(mostrarFundo) => escrever({ mostrarFundo })}
                    />
                    <SeletorPosicaoConteudo
                      horizontal={
                        (noMobile ? m?.alinhamentoHorizontal : banner.alinhamentoHorizontal) ??
                        banner.alinhamentoHorizontal ??
                        "ESQUERDA"
                      }
                      vertical={
                        (noMobile ? m?.alinhamentoVertical : banner.alinhamentoVertical) ??
                        banner.alinhamentoVertical ??
                        "FIM"
                      }
                      posicaoLivre={(noMobile ? m?.posicaoLivre : banner.posicaoLivre) ?? banner.posicaoLivre}
                      onChange={({ horizontal, vertical }) =>
                        escrever({ alinhamentoHorizontal: horizontal, alinhamentoVertical: vertical })
                      }
                      onChangeLivre={(posicaoLivre) => escrever({ posicaoLivre })}
                    />
                  </div>
                );
              })()}
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
        <div className="flex flex-col gap-4">
          <CampoTexto
            label="Texto do anúncio"
            value={secao.config.texto}
            placeholder="Frete grátis acima de R$ 200"
            onChange={(texto) => onChange({ ...secao, config: { ...secao.config, texto } })}
          />
          <div className="flex flex-col gap-2">
            <Label>Cor de fundo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corFundo ?? "#1c1917"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corFundo: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corFundo ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corFundo: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cor do texto</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corTexto ?? "#ffffff"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corTexto: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corTexto ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corTexto: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "CENTRO"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
        </div>
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
            <div className="flex items-center justify-between">
              <Label>Espaçamento entre linhas do cabeçalho</Label>
              <span className="text-muted-foreground text-xs">
                {secao.config.espacamentoLinhas ?? 8}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={secao.config.espacamentoLinhas ?? 8}
              onChange={(e) =>
                onChange({
                  ...secao,
                  config: { ...secao.config, espacamentoLinhas: Number(e.target.value) },
                })
              }
              className="accent-primary"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Tamanho da fonte das categorias</Label>
              <span className="text-muted-foreground text-xs">
                {secao.config.tamanhoFonteCategorias ?? 30}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={secao.config.tamanhoFonteCategorias ?? 30}
              onChange={(e) =>
                onChange({
                  ...secao,
                  config: { ...secao.config, tamanhoFonteCategorias: Number(e.target.value) },
                })
              }
              className="accent-primary"
            />
          </div>
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
          <div className="flex flex-col gap-2">
            <Label>Cor de fundo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corFundo ?? "#ffffff"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corFundo: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corFundo ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corFundo: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cor do texto</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corTexto ?? "#000000"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corTexto: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corTexto ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corTexto: e.target.value || undefined },
                  })
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Cor do nome da loja e do menu de categorias no cabeçalho.
            </p>
          </div>
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
          <div className="flex flex-col gap-2">
            <Label>Exibir em</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["AMBOS", "DESKTOP", "MOBILE"] as ExibirEm[]).map((exibirEm) => (
                <button
                  key={exibirEm}
                  type="button"
                  onClick={() => onChange({ ...secao, config: { ...secao.config, exibirEm } })}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    (secao.config.exibirEm ?? "AMBOS") === exibirEm
                      ? "border-primary ring-primary/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  {NOMES_EXIBIR_EM[exibirEm]}
                </button>
              ))}
            </div>
          </div>
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
                  config: {
                    ...secao.config,
                    categoriaId: !v || v === "_todas" ? undefined : v,
                    // Seleção manual é sempre relativa a UMA categoria — trocar
                    // ou limpar a categoria invalida a seleção anterior.
                    produtosSelecionados: undefined,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Carregando categorias...">
                  {secao.config.categoriaId
                    ? (categorias.find((c) => c.id === secao.config.categoriaId)?.nome ??
                      "Carregando categorias...")
                    : "Todos os destaques"}
                </SelectValue>
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Quantidade de produtos</Label>
              <span className="text-muted-foreground text-xs">
                {secao.config.quantidade ?? "Todos"}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={secao.config.quantidade ?? 24}
              onChange={(e) => {
                const valor = Number(e.target.value);
                onChange({
                  ...secao,
                  config: { ...secao.config, quantidade: valor >= 24 ? undefined : valor },
                });
              }}
              className="accent-primary"
            />
            <p className="text-muted-foreground text-xs">
              Arraste até o fim para mostrar todos os produtos, sem limite.
            </p>
          </div>
          {secao.config.categoriaId && (
            <SeletorProdutosCategoria
              categoriaId={secao.config.categoriaId}
              produtosSelecionados={secao.config.produtosSelecionados}
              onChange={(produtosSelecionados) =>
                onChange({ ...secao, config: { ...secao.config, produtosSelecionados } })
              }
            />
          )}
          <CampoSwitch
            label='Mostrar link "Ver tudo"'
            checked={secao.config.linkVerTudo}
            onChange={(linkVerTudo) => onChange({ ...secao, config: { ...secao.config, linkVerTudo } })}
          />
          <CampoSwitch
            label="Mostrar preço dos produtos"
            checked={secao.config.mostrarPreco ?? true}
            onChange={(mostrarPreco) => onChange({ ...secao, config: { ...secao.config, mostrarPreco } })}
          />
          <SeletorAlinhamento
            value={secao.config.alinhamento ?? "ESQUERDA"}
            onChange={(alinhamento) => onChange({ ...secao, config: { ...secao.config, alinhamento } })}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Tamanho da imagem</Label>
              <span className="text-muted-foreground text-xs">{secao.config.tamanhoImagem ?? "Padrão"}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={secao.config.tamanhoImagem ?? 40}
              onChange={(e) =>
                onChange({ ...secao, config: { ...secao.config, tamanhoImagem: Number(e.target.value) } })
              }
              className="accent-primary"
            />
            <p className="text-muted-foreground text-xs">
              Controla o tamanho dos cards na grade — maior imagem, menos produtos por linha.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Layout no mobile</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["GRADE", "CARROSSEL"] as const).map((layout) => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => onChange({ ...secao, config: { ...secao.config, layoutMobile: layout } })}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    (secao.config.layoutMobile ?? "GRADE") === layout
                      ? "border-primary ring-primary/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  {layout === "GRADE" ? "Grade" : "Carrossel"}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Carrossel mostra um produto por vez — só afeta o mobile, o desktop sempre usa grade.
            </p>
          </div>
          {secao.config.layoutMobile === "CARROSSEL" && (
            <CampoSwitch
              label='Mostrar variação e "Adicionar ao carrinho" no carrossel'
              checked={secao.config.mostrarComprarCarrossel ?? true}
              onChange={(mostrarComprarCarrossel) =>
                onChange({ ...secao, config: { ...secao.config, mostrarComprarCarrossel } })
              }
            />
          )}
          <div className="flex flex-col gap-2">
            <Label>Cor do botão &quot;Adicionar ao carrinho&quot;</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corBotao ?? "#000000"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corBotao: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corBotao ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corBotao: e.target.value || undefined },
                  })
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Vale só pros cards desta seção (grade e carrossel mobile) — outras seções e a
              página do produto não são afetadas.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cor do texto do botão</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secao.config.corTextoBotao ?? "#ffffff"}
                onChange={(e) =>
                  onChange({ ...secao, config: { ...secao.config, corTextoBotao: e.target.value } })
                }
                className="h-9 w-12 rounded-md border"
              />
              <Input
                value={secao.config.corTextoBotao ?? ""}
                placeholder="Padrão do tema"
                onChange={(e) =>
                  onChange({
                    ...secao,
                    config: { ...secao.config, corTextoBotao: e.target.value || undefined },
                  })
                }
              />
            </div>
          </div>
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

    case "SELOS":
      return <FormularioSelos config={secao.config} onChange={(config) => onChange({ ...secao, config })} />;

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

      <div className="flex flex-col gap-2">
        <Label>Cor de fundo da página</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={estilo.corFundo ?? "#ffffff"}
            onChange={(e) => onChangeEstilo({ ...estilo, corFundo: e.target.value })}
            className="h-9 w-12 rounded-md border"
          />
          <Input
            value={estilo.corFundo ?? ""}
            placeholder="Padrão do tema"
            onChange={(e) =>
              onChangeEstilo({ ...estilo, corFundo: e.target.value || undefined })
            }
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Fundo de toda a página da loja — diferente da cor de fundo do cabeçalho, que afeta só ele.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Cor do texto da página</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={estilo.corTexto ?? "#000000"}
            onChange={(e) => onChangeEstilo({ ...estilo, corTexto: e.target.value })}
            className="h-9 w-12 rounded-md border"
          />
          <Input
            value={estilo.corTexto ?? ""}
            placeholder="Padrão do tema"
            onChange={(e) =>
              onChangeEstilo({ ...estilo, corTexto: e.target.value || undefined })
            }
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Use para ajustar a legibilidade do texto quando a cor de fundo da página for escura.
        </p>
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
      <aside className="text-muted-foreground flex w-[420px] shrink-0 items-center justify-center border-l p-6 text-center text-sm">
        Selecione uma seção no preview ou na lista à esquerda para editar.
      </aside>
    );
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto border-l p-4">
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
