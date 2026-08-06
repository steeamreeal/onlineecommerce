import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { AlinhamentoTexto, PosicaoVertical, SecaoTema } from "@/lib/tema-loja";

type Variante = "MINIMALISTA" | "EDITORIAL" | "VITRINE";
type Categoria = RouterOutputs["lojaPublica"]["categorias"][number];
type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

// Dados salvos antes do campo `alinhamento` existir não passam pelo default
// do Zod (só a mutation de save valida) — sempre ler com fallback aqui.
const classeTextoPorAlinhamento: Record<AlinhamentoTexto, string> = {
  ESQUERDA: "text-left items-start",
  CENTRO: "text-center items-center",
  DIREITA: "text-right items-end",
};

function classeAlinhamento(alinhamento: AlinhamentoTexto | undefined): string {
  return classeTextoPorAlinhamento[alinhamento ?? "ESQUERDA"];
}

const classePosicaoVertical: Record<PosicaoVertical, string> = {
  INICIO: "items-start justify-start",
  CENTRO: "items-center justify-center",
  FIM: "items-end justify-end",
};

// Aparência de cada seção por template — mesmas classes que antes viviam
// hardcoded em cada components/store/template-*.tsx, agora indexadas por
// variante para que o editor de tema possa trocar o "skin" sem duplicar a
// estrutura de seções. Os templates antigos continuam existindo à parte,
// usados só como fallback para lojas sem temaConfig (ver page.tsx).
const heroClassePorVariante: Record<Variante, string> = {
  MINIMALISTA:
    "bg-muted relative flex aspect-[4/5] items-end overflow-hidden rounded-md md:aspect-[3/1]",
  EDITORIAL:
    "bg-accent relative flex aspect-[4/5] items-center justify-center overflow-hidden px-6 text-center md:aspect-[3/1]",
  VITRINE:
    "relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[var(--loja-primary)] px-6 text-center text-white md:aspect-[3/1]",
};

const categoriaLinkClassePorVariante: Record<Variante, string> = {
  MINIMALISTA: "text-muted-foreground hover:text-foreground",
  EDITORIAL: "font-heading text-muted-foreground hover:text-foreground",
  VITRINE:
    "rounded-full border-2 border-[var(--loja-primary)]/30 px-4 py-1.5 text-sm font-medium text-[var(--loja-primary)] hover:border-[var(--loja-primary)]",
};

const categoriasWrapperClassePorVariante: Record<Variante, string> = {
  MINIMALISTA: "flex flex-wrap gap-2 text-sm",
  EDITORIAL: "flex flex-wrap justify-center gap-6 text-sm",
  VITRINE: "flex flex-wrap gap-2",
};

const tituloSecaoClassePorVariante: Record<Variante, string> = {
  MINIMALISTA: "text-base font-medium",
  EDITORIAL: "font-heading text-center text-2xl",
  VITRINE: "text-lg font-bold",
};

const gridProdutosClassePorVariante: Record<Variante, string> = {
  MINIMALISTA: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
  EDITORIAL: "grid grid-cols-2 gap-8 sm:grid-cols-3",
  VITRINE: "grid grid-cols-2 gap-4 sm:grid-cols-3",
};

const verTudoLinkClassePorVariante: Record<Variante, string> = {
  MINIMALISTA: "text-muted-foreground hover:text-foreground text-xs",
  EDITORIAL: "text-muted-foreground hover:text-foreground text-center text-sm",
  VITRINE: "text-sm font-medium text-[var(--loja-primary)]",
};

function ConteudoHero({
  variante,
  slug,
  titulo,
  textoBotao,
  linkBotao,
  alinhamentoHorizontal,
  alinhamentoVertical,
}: {
  variante: Variante;
  slug: string;
  titulo?: string;
  textoBotao?: string;
  linkBotao?: string;
  alinhamentoHorizontal?: AlinhamentoTexto;
  alinhamentoVertical?: PosicaoVertical;
}) {
  if (!titulo && !textoBotao) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex p-4",
        classePosicaoVertical[alinhamentoVertical ?? "FIM"],
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[85%] flex-col gap-2 rounded-md px-4 py-3 backdrop-blur-sm",
          variante === "VITRINE" ? "bg-white/85" : "bg-black/55",
          classeAlinhamento(alinhamentoHorizontal),
        )}
      >
        {titulo && (
          <span
            className={cn(
              "font-medium",
              variante === "EDITORIAL" ? "font-heading text-xl italic" : "text-sm",
              variante === "VITRINE" ? "text-foreground" : "text-white",
            )}
          >
            {titulo}
          </span>
        )}
        {textoBotao && (
          <Link
            href={linkBotao || `/loja/${slug}/produtos`}
            className="bg-background text-foreground w-fit rounded-md px-4 py-2 text-sm font-medium"
          >
            {textoBotao}
          </Link>
        )}
      </div>
    </div>
  );
}

function SecaoHero({
  variante,
  config,
  slug,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "HERO" }>["config"];
  slug: string;
}) {
  const classeSecao =
    variante === "MINIMALISTA" && !config.coladoNoCabecalho ? "px-6 pt-6" : variante === "MINIMALISTA" ? "px-6" : undefined;

  if (config.banners.length === 0) {
    return (
      <section className={classeSecao}>
        <div className={heroClassePorVariante[variante]} />
      </section>
    );
  }

  // BannerCarousel usa `id` como key de navegação/loop; banners recém-
  // adicionados no editor (antes do primeiro save) ainda não têm id salvo.
  const banners = config.banners.map((banner, i) => ({ ...banner, id: banner.id ?? `${i}` }));

  return (
    <section className={classeSecao}>
      <BannerCarousel
        banners={banners}
        className={heroClassePorVariante[variante]}
        renderOverlay={(banner) => (
          <>
            {banner.link && (
              <Link
                href={banner.link}
                aria-label={banner.titulo || "Ir para o link do banner"}
                className="absolute inset-0"
              />
            )}
            <ConteudoHero
              variante={variante}
              slug={slug}
              titulo={banner.titulo}
              textoBotao={banner.textoBotao}
              linkBotao={banner.linkBotao}
              alinhamentoHorizontal={banner.alinhamentoHorizontal}
              alinhamentoVertical={banner.alinhamentoVertical}
            />
          </>
        )}
      />
    </section>
  );
}

const tamanhoMenuCategoriasClasse: Record<"PEQUENO" | "MEDIO" | "GRANDE", string> = {
  PEQUENO: "text-xs",
  MEDIO: "text-sm",
  GRANDE: "text-base",
};

function SecaoMenuCategorias({
  variante,
  config,
  slug,
  categorias,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "MENU_CATEGORIAS" }>["config"];
  slug: string;
  categorias: Categoria[];
}) {
  if (categorias.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 px-6">
      <div
        className={cn(
          categoriasWrapperClassePorVariante[variante],
          tamanhoMenuCategoriasClasse[config.tamanho ?? "MEDIO"],
          config.alinhamento === "CENTRO"
            ? "justify-center"
            : config.alinhamento === "DIREITA"
              ? "justify-end"
              : undefined,
        )}
      >
        {categorias.map((categoria) => (
          <Link
            key={categoria.id}
            href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
            className={categoriaLinkClassePorVariante[variante]}
            style={config.cor ? { color: config.cor } : undefined}
          >
            {categoria.nome}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SecaoColecaoDestaque({
  variante,
  config,
  slug,
  destaques,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "COLECAO_DESTAQUE" }>["config"];
  slug: string;
  destaques: Produto[];
}) {
  let produtos = config.categoriaId
    ? destaques.filter((p) => p.categoria?.id === config.categoriaId)
    : destaques;

  // Com categoria + seleção manual, usa exatamente os produtos escolhidos
  // pelo lojista, na ordem escolhida — em vez do filtro automático acima.
  // Produtos removidos/inativados desde a seleção somem sozinhos aqui
  // (não estão mais em `destaques`), sem precisar de limpeza manual.
  if (config.categoriaId && config.produtosSelecionados && config.produtosSelecionados.length > 0) {
    const porId = new Map(produtos.map((p) => [p.id, p]));
    produtos = config.produtosSelecionados.map((id) => porId.get(id)).filter((p): p is Produto => Boolean(p));
  }

  if (config.quantidade) {
    produtos = produtos.slice(0, config.quantidade);
  }

  return (
    <>
      {produtos.length > 0 && (
        <section className="flex flex-col gap-4 px-6">
          <div className={cn("flex", classeAlinhamento(config.alinhamento))}>
            <h2 className={cn(tituloSecaoClassePorVariante[variante], classeAlinhamento(config.alinhamento))}>
              {config.titulo}
            </h2>
          </div>
          <div className={gridProdutosClassePorVariante[variante]}>
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                slug={slug}
                variante={variante.toLowerCase() as "minimalista" | "editorial" | "vitrine"}
              />
            ))}
          </div>
          {config.linkVerTudo && (
            <div
              className={cn(
                "flex",
                config.alinhamento === "CENTRO"
                  ? "justify-center"
                  : config.alinhamento === "DIREITA"
                    ? "justify-end"
                    : "justify-start",
              )}
            >
              <Link href={`/loja/${slug}/produtos`} className={verTudoLinkClassePorVariante[variante]}>
                Ver todos
              </Link>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function SecaoTexto({ config }: { config: Extract<SecaoTema, { tipo: "TEXTO" }>["config"] }) {
  return (
    <section className={cn("flex flex-col gap-2 px-6", classeAlinhamento(config.alinhamento))}>
      {config.titulo && <h2 className="text-base font-medium">{config.titulo}</h2>}
      <p className="text-muted-foreground text-sm whitespace-pre-line">{config.corpo}</p>
    </section>
  );
}

const classeAlinhamentoTextoSimples: Record<AlinhamentoTexto, string> = {
  ESQUERDA: "text-left",
  CENTRO: "text-center",
  DIREITA: "text-right",
};

function SecaoBarraAnuncio({ config }: { config: Extract<SecaoTema, { tipo: "BARRA_ANUNCIO" }>["config"] }) {
  if (!config.texto) return null;
  return (
    <div
      className={cn(
        "px-6 py-2 text-xs",
        !config.corFundo && "bg-foreground",
        !config.corTexto && "text-background",
        classeAlinhamentoTextoSimples[config.alinhamento ?? "CENTRO"],
      )}
      style={{ backgroundColor: config.corFundo, color: config.corTexto }}
    >
      {config.texto}
    </div>
  );
}

/**
 * Monta a home pública da loja a partir de temaConfig.secoes, despachando
 * cada seção para o componente correspondente e aplicando a aparência do
 * `template` ativo (variante) em cada uma — mesmo "skin" que antes vivia
 * hardcoded em cada template-*.tsx, agora combinável com a composição de
 * seções escolhida pelo lojista no editor de tema.
 */
export function ThemeRenderer({
  secoes,
  template,
  slug,
  categorias,
  destaques,
}: {
  secoes: SecaoTema[];
  template: Variante;
  slug: string;
  categorias: Categoria[];
  destaques: Produto[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-12 pb-12">
      {secoes.map((secao) => {
        if (!secao.visivel) return null;

        switch (secao.tipo) {
          case "BARRA_ANUNCIO":
            return <SecaoBarraAnuncio key={secao.id} config={secao.config} />;
          case "CABECALHO":
          case "RODAPE":
            // Renderizados por SiteHeader/SiteFooter no layout, não aqui.
            return null;
          case "HERO":
            return (
              <SecaoHero key={secao.id} variante={template} config={secao.config} slug={slug} />
            );
          case "MENU_CATEGORIAS":
            return (
              <SecaoMenuCategorias
                key={secao.id}
                variante={template}
                config={secao.config}
                slug={slug}
                categorias={categorias}
              />
            );
          case "COLECAO_DESTAQUE":
            return (
              <SecaoColecaoDestaque
                key={secao.id}
                variante={template}
                config={secao.config}
                slug={slug}
                destaques={destaques}
              />
            );
          case "TEXTO":
            return <SecaoTexto key={secao.id} config={secao.config} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
