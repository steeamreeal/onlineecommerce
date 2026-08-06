"use client";

import { useState } from "react";
import {
  X,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
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

const LINHAS_POSICAO: PosicaoVertical[] = ["INICIO", "CENTRO", "FIM"];
const COLUNAS_POSICAO: AlinhamentoTexto[] = ["ESQUERDA", "CENTRO", "DIREITA"];

// Nove pontos de ancoragem do conteúdo (título/botão) sobre a imagem do
// banner — combina os dois eixos independentes já existentes no schema
// (alinhamentoHorizontal x alinhamentoVertical) numa única grade de cliques,
// em vez de dois seletores separados.
function SeletorPosicaoConteudo({
  horizontal,
  vertical,
  onChange,
}: {
  horizontal: AlinhamentoTexto;
  vertical: PosicaoVertical;
  onChange: (valor: { horizontal: AlinhamentoTexto; vertical: PosicaoVertical }) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Onde o texto aparece sobre a imagem</Label>
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

            {(banner.titulo || banner.textoBotao) && (
              <SeletorPosicaoConteudo
                horizontal={banner.alinhamentoHorizontal ?? "ESQUERDA"}
                vertical={banner.alinhamentoVertical ?? "FIM"}
                onChange={({ horizontal, vertical }) =>
                  atualizarBanner(i, { alinhamentoHorizontal: horizontal, alinhamentoVertical: vertical })
                }
              />
            )}
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
