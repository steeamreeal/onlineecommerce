"use client";

import { Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { ThemeRenderer } from "@/components/store/theme-renderer";
import { alturaLogoEmPx } from "@/lib/tema-loja";
import type { SecaoTema, TipoSecaoTema } from "@/lib/tema-loja";

// Prévia visual do cabeçalho/rodapé dentro do editor — não reaproveita
// SiteHeader/SiteFooter diretamente porque eles dependem de CartProvider e
// disparam ações reais (abrir carrinho, links de navegação); aqui é só uma
// representação estática que reflete a config, sem interatividade.
function PreviewCabecalho({
  nome,
  logoUrl,
  exibicaoLogo,
  tamanhoLogo,
  mostrarBusca,
  mostrarConta,
  posicaoLogo,
  viewport,
}: {
  nome: string;
  logoUrl: string | null | undefined;
  exibicaoLogo: "LOGO" | "NOME";
  tamanhoLogo: number;
  mostrarBusca: boolean;
  mostrarConta: boolean;
  posicaoLogo: "ESQUERDA" | "CENTRO";
  viewport: "DESKTOP" | "MOBILE";
}) {
  const logo =
    exibicaoLogo === "LOGO" && logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage
      <img
        src={logoUrl}
        alt={nome}
        className="w-auto object-contain"
        style={{ height: alturaLogoEmPx(tamanhoLogo) }}
      />
    ) : (
      <span className="text-lg font-semibold">{nome}</span>
    );
  const busca = mostrarBusca ? (
    <div className="border-input text-muted-foreground relative min-w-[160px] flex-1 rounded-md border px-3 py-1.5 text-sm">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <span className="pl-5">Buscar produtos</span>
    </div>
  ) : null;
  const acoes = (
    <div className="flex items-center gap-2">
      {mostrarConta && (
        <div className="border-input flex size-8 items-center justify-center rounded-md border">
          <User className="size-4" />
        </div>
      )}
      <div className="border-input flex size-8 items-center justify-center rounded-md border">
        <ShoppingBag className="size-4" />
      </div>
    </div>
  );

  if (viewport === "MOBILE") {
    return (
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="w-8" />
          <div className="flex justify-center">{logo}</div>
          <div className="flex items-center justify-end gap-4">{acoes}</div>
        </div>
        {busca && <div className="px-6 pb-4">{busca}</div>}
      </div>
    );
  }

  if (posicaoLogo === "CENTRO") {
    return (
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <div className="flex flex-1 items-center gap-4">{busca}</div>
        {logo}
        <div className="flex flex-1 items-center justify-end gap-4">{acoes}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border-b px-6 py-4">
      {logo}
      {busca}
      {acoes}
    </div>
  );
}

function PreviewRodape({
  nome,
  mostrarNewsletter,
  mostrarFormasPagamento,
  colunas,
}: {
  nome: string;
  mostrarNewsletter: boolean;
  mostrarFormasPagamento: boolean;
  colunas: { id: string; titulo: string; links: { id: string; texto: string }[] }[];
}) {
  return (
    <div className="mt-8 border-t">
      {mostrarNewsletter && (
        <div className="border-b px-6 py-6 text-center text-sm">
          <span className="font-medium">Receba novidades e ofertas exclusivas</span>
        </div>
      )}
      <div className="grid gap-4 px-6 py-6 text-sm sm:grid-cols-3">
        <span className="font-medium">{nome}</span>
        {colunas.map((coluna) => (
          <div key={coluna.id} className="flex flex-col gap-1">
            <span className="font-medium">{coluna.titulo || "Coluna"}</span>
            {coluna.links.map((link) => (
              <span key={link.id} className="text-muted-foreground">
                {link.texto || "Link"}
              </span>
            ))}
          </div>
        ))}
      </div>
      {mostrarFormasPagamento && (
        <div className="border-t px-6 py-3 text-xs">
          <div className="flex gap-2">
            {["Visa", "Mastercard", "Pix", "Boleto"].map((f) => (
              <span key={f} className="text-muted-foreground rounded border px-2 py-1">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Preview ao vivo da home da loja dentro do editor — mesmo ThemeRenderer do
 * site público, alimentado pelo estado local (não salvo) do editor. Clicar
 * numa seção do preview seleciona ela na árvore, igual ao editor de tema da
 * Shopify (data-secao-id + listener de clique delegado).
 */
export function PreviewTema({
  slug,
  nomeLoja,
  logoUrl,
  secoes,
  template,
  corPrimaria,
  secaoSelecionadaId,
  onSelecionarSecao,
  viewport = "DESKTOP",
}: {
  slug: string;
  nomeLoja: string;
  logoUrl: string | null | undefined;
  secoes: SecaoTema[];
  template: "MINIMALISTA" | "EDITORIAL" | "VITRINE";
  corPrimaria: string;
  secaoSelecionadaId: string | null;
  onSelecionarSecao: (id: string, tipo: TipoSecaoTema) => void;
  viewport?: "DESKTOP" | "MOBILE";
}) {
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery({ slug });
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery({ slug });

  const barraAnuncio = secoes.find((s) => s.tipo === "BARRA_ANUNCIO");
  const cabecalho = secoes.find((s) => s.tipo === "CABECALHO");
  const rodape = secoes.find((s) => s.tipo === "RODAPE");
  const secoesModelo = secoes.filter((s) => s.tipo !== "BARRA_ANUNCIO" && s.tipo !== "RODAPE" && s.tipo !== "CABECALHO");

  function handleClick(e: React.MouseEvent) {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-secao-id]");
    if (!alvo) return;
    const id = alvo.dataset.secaoId!;
    const tipo = alvo.dataset.secaoTipo as TipoSecaoTema;
    onSelecionarSecao(id, tipo);
  }

  return (
    <div className="bg-muted/30 flex flex-1 justify-center overflow-y-auto p-6">
      <div
        onClick={handleClick}
        className={cn(
          "min-h-full w-full overflow-hidden rounded-md border bg-background shadow-sm transition-[max-width]",
          viewport === "MOBILE" ? "max-w-sm" : "max-w-3xl",
        )}
        style={{ "--loja-primary": corPrimaria } as React.CSSProperties}
      >
        {barraAnuncio && (
          <button
            type="button"
            data-secao-id={barraAnuncio.id}
            data-secao-tipo={barraAnuncio.tipo}
            className={cn(
              "block w-full text-left outline-none",
              secaoSelecionadaId === barraAnuncio.id && "ring-primary ring-2 ring-inset",
            )}
          >
            {barraAnuncio.visivel && barraAnuncio.config.texto && (
              <div
                className={cn(
                  "px-6 py-2 text-xs",
                  !barraAnuncio.config.corFundo && "bg-foreground",
                  !barraAnuncio.config.corTexto && "text-background",
                  barraAnuncio.config.alinhamento === "ESQUERDA"
                    ? "text-left"
                    : barraAnuncio.config.alinhamento === "DIREITA"
                      ? "text-right"
                      : "text-center",
                )}
                style={{
                  backgroundColor: barraAnuncio.config.corFundo,
                  color: barraAnuncio.config.corTexto,
                }}
              >
                {barraAnuncio.config.texto}
              </div>
            )}
          </button>
        )}

        {cabecalho && (
          <button
            type="button"
            data-secao-id={cabecalho.id}
            data-secao-tipo={cabecalho.tipo}
            className={cn(
              "block w-full text-left outline-none",
              secaoSelecionadaId === cabecalho.id && "ring-primary ring-2 ring-inset",
              !cabecalho.visivel && "opacity-30",
            )}
          >
            <PreviewCabecalho
              nome={nomeLoja}
              logoUrl={logoUrl}
              exibicaoLogo={cabecalho.config.exibicaoLogo ?? "NOME"}
              tamanhoLogo={cabecalho.config.tamanhoLogo ?? 40}
              mostrarBusca={cabecalho.config.mostrarBusca ?? true}
              mostrarConta={cabecalho.config.mostrarConta ?? true}
              posicaoLogo={cabecalho.config.posicaoLogo ?? "ESQUERDA"}
              viewport={viewport}
            />
          </button>
        )}

        <div className="flex flex-col gap-8 py-6">
          {secoesModelo.map((secao) => (
            <button
              key={secao.id}
              type="button"
              data-secao-id={secao.id}
              data-secao-tipo={secao.tipo}
              className={cn(
                "block w-full text-left outline-none",
                secaoSelecionadaId === secao.id && "ring-primary ring-2 ring-inset",
                !secao.visivel && "opacity-30",
              )}
            >
              <ThemeRenderer
                secoes={[secao]}
                template={template}
                slug={slug}
                categorias={categorias ?? []}
                destaques={produtos ?? []}
                viewport={viewport}
              />
            </button>
          ))}
        </div>

        {rodape && (
          <button
            type="button"
            data-secao-id={rodape.id}
            data-secao-tipo={rodape.tipo}
            className={cn(
              "block w-full text-left outline-none",
              secaoSelecionadaId === rodape.id && "ring-primary ring-2 ring-inset",
              !rodape.visivel && "opacity-30",
            )}
          >
            <PreviewRodape
              nome={nomeLoja}
              mostrarNewsletter={rodape.config.mostrarNewsletter ?? false}
              mostrarFormasPagamento={rodape.config.mostrarFormasPagamento ?? false}
              colunas={rodape.config.colunas ?? []}
            />
          </button>
        )}
      </div>
    </div>
  );
}
