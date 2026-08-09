import Link from "next/link";
import { Truck, ShieldCheck, CreditCard, RefreshCw, BadgeCheck } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { ProductCarousel } from "@/components/store/product-carousel";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { RevealOnScroll } from "@/components/store/reveal-on-scroll";
import { AnimatedNumberText } from "@/components/store/animated-number-text";
import { cn } from "@/lib/utils";
import {
  FONTE_CSS_VAR,
  tamanhoFonteEmPx,
  paddingBotaoEmPx,
  arredondamentoBotaoEmPx,
  tamanhoImagemEmPx,
  tamanhoIconeSeloEmPx,
  resolverConteudoBannerMobile,
} from "@/lib/tema-loja";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { AlinhamentoTexto, PosicaoVertical, SecaoTema, FonteTema, IconeSelo, ConfigSelos } from "@/lib/tema-loja";

const ICONE_POR_SELO: Record<IconeSelo, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ENTREGA: Truck,
  GARANTIA: ShieldCheck,
  PAGAMENTO: CreditCard,
  TROCA: RefreshCw,
  QUALIDADE: BadgeCheck,
};

type Variante = "MINIMALISTA" | "EDITORIAL" | "VITRINE";
type Categoria = RouterOutputs["lojaPublica"]["categorias"][number];
export type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

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

// Eixos independentes do wrapper (flex-row) do conteúdo sobreposto ao
// banner: items-* é o eixo cruzado (vertical), justify-* é o eixo
// principal (horizontal). Antes disso vir de um único mapa combinado
// (bug: justify-* também variava com alinhamentoVertical, ignorando
// alinhamentoHorizontal — só 3 das 9 posições da grade ficavam certas).
const classeItemsVertical: Record<PosicaoVertical, string> = {
  INICIO: "items-start",
  CENTRO: "items-center",
  FIM: "items-end",
};

const classeJustifyHorizontal: Record<AlinhamentoTexto, string> = {
  ESQUERDA: "justify-start",
  CENTRO: "justify-center",
  DIREITA: "justify-end",
};

// Alinhamento próprio do botão (align-self), só aplicado quando o lojista
// escolhe uma posição explícita pro botão — sem isso, ele segue o
// alinhamento do título via items-* do container pai (classeAlinhamento).
const classeSelfPorAlinhamento: Record<AlinhamentoTexto, string> = {
  ESQUERDA: "self-start",
  CENTRO: "self-center",
  DIREITA: "self-end",
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
  fonteTitulo,
  tamanhoTitulo,
  fonteBotao,
  tamanhoFonteBotao,
  tamanhoBotao,
  arredondamentoBotao,
  mostrarFundo = true,
  alinhamentoBotao,
  posicaoLivre,
  classeVisibilidade,
}: {
  variante: Variante;
  slug: string;
  titulo?: string;
  textoBotao?: string;
  linkBotao?: string;
  alinhamentoHorizontal?: AlinhamentoTexto;
  alinhamentoVertical?: PosicaoVertical;
  fonteTitulo?: FonteTema;
  tamanhoTitulo?: number;
  fonteBotao?: FonteTema;
  tamanhoFonteBotao?: number;
  tamanhoBotao?: number;
  arredondamentoBotao?: number;
  mostrarFundo?: boolean;
  alinhamentoBotao?: AlinhamentoTexto;
  // Posição livre (arrastar no editor) em % — tem prioridade sobre
  // alinhamentoHorizontal/alinhamentoVertical (grade de 9 pontos) quando
  // definida.
  posicaoLivre?: { x: number; y: number };
  // Alterna entre a versão desktop e mobile no site público (viewport
  // undefined) — ver SecaoHero, que renderiza esse componente duas vezes,
  // uma com o estilo resolvido pro desktop e outra pro mobile.
  classeVisibilidade?: string;
}) {
  if (!titulo && !textoBotao) return null;

  const paddingBotao = paddingBotaoEmPx(tamanhoBotao);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        posicaoLivre
          ? undefined
          : cn(
              "flex p-4",
              classeItemsVertical[alinhamentoVertical ?? "FIM"],
              classeJustifyHorizontal[alinhamentoHorizontal ?? "ESQUERDA"],
            ),
        classeVisibilidade,
      )}
      style={
        posicaoLivre
          ? { left: `${posicaoLivre.x}%`, top: `${posicaoLivre.y}%`, transform: "translate(-50%, -50%)" }
          : undefined
      }
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[85%] flex-col gap-2",
          mostrarFundo && "rounded-md px-4 py-3 backdrop-blur-sm",
          mostrarFundo && (variante === "VITRINE" ? "bg-white/85" : "bg-black/55"),
          classeAlinhamento(alinhamentoHorizontal),
        )}
      >
        {titulo && (
          <span
            className={cn(
              "font-medium",
              variante === "EDITORIAL" ? "font-heading text-xl italic" : "text-sm",
              variante === "VITRINE" ? "text-foreground" : "text-white",
              // Sem o bloco de fundo, o texto fica direto sobre a imagem —
              // a sombra garante legibilidade em qualquer parte da foto.
              !mostrarFundo &&
                (variante === "VITRINE"
                  ? "drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)]"
                  : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"),
            )}
            style={{
              fontFamily: fonteTitulo ? FONTE_CSS_VAR[fonteTitulo] : undefined,
              fontSize: tamanhoFonteEmPx(tamanhoTitulo),
            }}
          >
            {titulo}
          </span>
        )}
        {textoBotao && (
          <Link
            href={linkBotao || `/loja/${slug}/produtos`}
            className={cn(
              "bg-background text-foreground w-fit rounded-md px-4 py-2 text-sm font-medium",
              alinhamentoBotao && classeSelfPorAlinhamento[alinhamentoBotao],
            )}
            style={{
              fontFamily: fonteBotao ? FONTE_CSS_VAR[fonteBotao] : undefined,
              fontSize: tamanhoFonteEmPx(tamanhoFonteBotao),
              paddingInline: paddingBotao?.paddingInline,
              paddingBlock: paddingBotao?.paddingBlock,
              borderRadius: arredondamentoBotaoEmPx(arredondamentoBotao),
            }}
          >
            {textoBotao}
          </Link>
        )}
      </div>
    </div>
  );
}

// Mapeia os campos de estilo/posição de um BannerTema (desktop ou já
// resolvido pro mobile via resolverConteudoBannerMobile) pras props flat de
// ConteudoHero — evita repetir a mesma lista longa duas vezes em SecaoHero.
type ConteudoBanner = {
  titulo?: string;
  textoBotao?: string;
  linkBotao?: string;
  alinhamentoHorizontal?: AlinhamentoTexto;
  alinhamentoVertical?: PosicaoVertical;
  fonteTitulo?: FonteTema;
  tamanhoTitulo?: number;
  fonteBotao?: FonteTema;
  tamanhoFonteBotao?: number;
  tamanhoBotao?: number;
  arredondamentoBotao?: number;
  mostrarFundo?: boolean;
  alinhamentoBotao?: AlinhamentoTexto;
  posicaoLivre?: { x: number; y: number };
  mobile?: Omit<ConteudoBanner, "titulo" | "textoBotao" | "linkBotao" | "mobile">;
};

function propsConteudoHero(variante: Variante, slug: string, banner: ConteudoBanner) {
  return {
    variante,
    slug,
    titulo: banner.titulo,
    textoBotao: banner.textoBotao,
    linkBotao: banner.linkBotao,
    alinhamentoHorizontal: banner.alinhamentoHorizontal,
    alinhamentoVertical: banner.alinhamentoVertical,
    fonteTitulo: banner.fonteTitulo,
    tamanhoTitulo: banner.tamanhoTitulo,
    fonteBotao: banner.fonteBotao,
    tamanhoFonteBotao: banner.tamanhoFonteBotao,
    tamanhoBotao: banner.tamanhoBotao,
    arredondamentoBotao: banner.arredondamentoBotao,
    mostrarFundo: banner.mostrarFundo,
    alinhamentoBotao: banner.alinhamentoBotao,
    posicaoLivre: banner.posicaoLivre,
  };
}

function SecaoHero({
  variante,
  config,
  slug,
  viewport,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "HERO" }>["config"];
  slug: string;
  viewport?: "DESKTOP" | "MOBILE";
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

  // No site público (viewport undefined) as duas versões existem no DOM e o
  // CSS decide qual mostrar — no preview do editor (viewport definido) a
  // simulação de mobile é um container estreito, não a largura real da
  // janela, então só uma delas é renderizada, escolhida explicitamente.
  const mostrarDesktop = viewport ? viewport === "DESKTOP" : true;
  const mostrarMobile = viewport ? viewport === "MOBILE" : true;

  return (
    <section className={classeSecao}>
      <BannerCarousel
        banners={banners}
        className={heroClassePorVariante[variante]}
        viewport={viewport}
        renderOverlay={(banner) => (
          <>
            {banner.link && (
              <Link
                href={banner.link}
                aria-label={banner.titulo || "Ir para o link do banner"}
                className="absolute inset-0"
              />
            )}
            {mostrarDesktop && (
              <ConteudoHero
                {...propsConteudoHero(variante, slug, banner)}
                classeVisibilidade={viewport ? undefined : "hidden md:flex"}
              />
            )}
            {mostrarMobile && (
              <ConteudoHero
                {...propsConteudoHero(variante, slug, resolverConteudoBannerMobile(banner, banner.mobile))}
                classeVisibilidade={viewport ? undefined : "flex md:hidden"}
              />
            )}
          </>
        )}
      />
    </section>
  );
}

// Mais baixo que o Hero (aspect-[3/1] no desktop) em todas as alturas — é
// pra ser uma faixa promocional pontual entre seções, não outro banner
// principal disputando atenção com o Hero.
const alturaBannerSecundarioClasse: Record<"PEQUENA" | "MEDIA" | "GRANDE", string> = {
  PEQUENA: "aspect-[16/9] md:aspect-[6/1]",
  MEDIA: "aspect-[16/9] md:aspect-[4/1]",
  GRANDE: "aspect-[4/5] md:aspect-[3/1]",
};

function SecaoBannerSecundario({
  variante,
  config,
  slug,
  viewport,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "BANNER_SECUNDARIO" }>["config"];
  slug: string;
  viewport?: "DESKTOP" | "MOBILE";
}) {
  if (!config.banner) return null;

  const banner = { ...config.banner, id: config.banner.id ?? "0" };
  const classeAltura = alturaBannerSecundarioClasse[config.altura ?? "PEQUENA"];
  const mostrarDesktop = viewport ? viewport === "DESKTOP" : true;
  const mostrarMobile = viewport ? viewport === "MOBILE" : true;

  return (
    <section className={variante === "MINIMALISTA" ? "px-6" : undefined}>
      <BannerCarousel
        banners={[banner]}
        className={cn(
          "bg-muted relative flex items-end overflow-hidden",
          variante === "MINIMALISTA" ? "rounded-md" : undefined,
          classeAltura,
        )}
        viewport={viewport}
        renderOverlay={(b) => (
          <>
            {b.link && (
              <Link
                href={b.link}
                aria-label={b.titulo || "Ir para o link do banner"}
                className="absolute inset-0"
              />
            )}
            {mostrarDesktop && (
              <ConteudoHero
                {...propsConteudoHero(variante, slug, b)}
                classeVisibilidade={viewport ? undefined : "hidden md:flex"}
              />
            )}
            {mostrarMobile && (
              <ConteudoHero
                {...propsConteudoHero(variante, slug, resolverConteudoBannerMobile(b, b.mobile))}
                classeVisibilidade={viewport ? undefined : "flex md:hidden"}
              />
            )}
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

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Menor preço efetivo (promo, se houver) entre os produtos de cada
// categoria — usado pelo "a partir de R$X" do menu de categorias. Calculado
// no client a partir da mesma lista de produtos que já veio pra montar a
// Coleção em destaque, sem precisar de uma query própria.
export function calcularPrecoMinimoPorCategoria(produtos: Produto[]): Map<string, number> {
  const minimoPorCategoria = new Map<string, number>();
  for (const produto of produtos) {
    const categoriaId = produto.categoria?.id;
    if (!categoriaId) continue;
    const preco = Number(produto.precoPromo ?? produto.precoNormal);
    const atual = minimoPorCategoria.get(categoriaId);
    if (atual == null || preco < atual) minimoPorCategoria.set(categoriaId, preco);
  }
  return minimoPorCategoria;
}

function SecaoMenuCategorias({
  variante,
  config,
  slug,
  categorias,
  destaques,
  viewport,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "MENU_CATEGORIAS" }>["config"];
  slug: string;
  categorias: Categoria[];
  destaques: Produto[];
  viewport?: "DESKTOP" | "MOBILE";
}) {
  if (categorias.length === 0) return null;

  const precoMinimoPorCategoria = config.mostrarPrecoApartirDe
    ? calcularPrecoMinimoPorCategoria(destaques)
    : null;

  const exibirEm = config.exibirEm ?? "AMBOS";
  // No preview do editor (viewport definido) a simulação de mobile é um
  // container estreito, não a largura real da janela — então as classes
  // `md:` do Tailwind não reagem, e a decisão precisa ser explícita aqui.
  // No site público (viewport undefined) o comportamento é só responsivo.
  if (viewport && exibirEm !== "AMBOS" && exibirEm !== viewport) return null;

  return (
    <section
      className={cn(
        "flex-col gap-4 px-6",
        viewport
          ? "flex"
          : exibirEm === "DESKTOP"
            ? "hidden md:flex"
            : exibirEm === "MOBILE"
              ? "flex md:hidden"
              : "flex",
      )}
    >
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
        {categorias.map((categoria) => {
          const precoMinimo = precoMinimoPorCategoria?.get(categoria.id);
          return (
            <Link
              key={categoria.id}
              href={`/loja/${slug}/produtos?categoria=${categoria.id}`}
              className={cn(
                categoriaLinkClassePorVariante[variante],
                precoMinimo != null && "flex flex-col items-center gap-0.5",
              )}
              style={config.cor ? { color: config.cor } : undefined}
            >
              {categoria.nome}
              {precoMinimo != null && (
                <span className="text-[0.7em] font-normal opacity-70">
                  A partir de {formatoMoeda.format(precoMinimo)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Decide quais produtos aparecem numa seção Coleção em destaque e em que
// ordem, a partir do modo escolhido pelo lojista — extraída do componente
// pra ser testável sem precisar montar a árvore de componentes React.
export function selecionarProdutosColecao(
  destaques: Produto[],
  config: Partial<
    Pick<
      Extract<SecaoTema, { tipo: "COLECAO_DESTAQUE" }>["config"],
      "categoriaId" | "modo" | "produtosSelecionados" | "quantidade"
    >
  >,
  rankingMaisVendidos?: string[],
): Produto[] {
  const modo = config.modo ?? "MANUAL";

  let produtos = config.categoriaId
    ? destaques.filter((p) => p.categoria?.id === config.categoriaId)
    : destaques;

  if (modo === "MANUAL") {
    // Com categoria + seleção manual, usa exatamente os produtos escolhidos
    // pelo lojista, na ordem escolhida — em vez do filtro automático acima.
    // Produtos removidos/inativados desde a seleção somem sozinhos aqui
    // (não estão mais em `destaques`), sem precisar de limpeza manual.
    if (config.categoriaId && config.produtosSelecionados && config.produtosSelecionados.length > 0) {
      const porId = new Map(produtos.map((p) => [p.id, p]));
      produtos = config.produtosSelecionados.map((id) => porId.get(id)).filter((p): p is Produto => Boolean(p));
    }
  } else if (modo === "LANCAMENTOS") {
    produtos = [...produtos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } else if (modo === "MAIS_VENDIDOS") {
    const ranking = rankingMaisVendidos ?? [];
    const porId = new Map(produtos.map((p) => [p.id, p]));
    const ordenados = ranking.map((id) => porId.get(id)).filter((p): p is Produto => Boolean(p));
    // Produtos sem nenhuma venda ainda (fora do ranking) completam a lista no
    // final, na ordem normal — evita a seção ficar vazia numa loja nova.
    const idsRankeados = new Set(ordenados.map((p) => p.id));
    produtos = [...ordenados, ...produtos.filter((p) => !idsRankeados.has(p.id))];
  }

  if (config.quantidade) {
    produtos = produtos.slice(0, config.quantidade);
  }

  return produtos;
}

function SecaoColecaoDestaque({
  variante,
  config,
  slug,
  destaques,
  viewport,
  rankingMaisVendidos,
}: {
  variante: Variante;
  config: Extract<SecaoTema, { tipo: "COLECAO_DESTAQUE" }>["config"];
  slug: string;
  destaques: Produto[];
  viewport?: "DESKTOP" | "MOBILE";
  rankingMaisVendidos?: string[];
}) {
  const produtos = selecionarProdutosColecao(destaques, config, rankingMaisVendidos);

  // Selo "Mais vendido" no card — top 10 da loja inteira, não só desta
  // seção, então mesmo uma seção MANUAL/LANCAMENTOS pode mostrar o selo em
  // quem também está entre os mais vendidos.
  const topVendidosIds = new Set((rankingMaisVendidos ?? []).slice(0, 10));

  const mostrarPreco = config.mostrarPreco ?? true;
  const variantLower = variante.toLowerCase() as "minimalista" | "editorial" | "vitrine";
  const layoutCarrossel = config.layoutMobile === "CARROSSEL";
  // No preview do editor (viewport definido) a simulação de mobile é um
  // container estreito, não a largura real da janela — as classes
  // max-md:/md: do Tailwind não reagem a isso, então a decisão de qual
  // bloco (grade ou carrossel) aparece precisa ser explícita ali. No site
  // público (viewport undefined) os dois blocos existem e o CSS decide.
  const exibirGrade = viewport ? viewport === "DESKTOP" || !layoutCarrossel : true;
  const exibirCarrossel = layoutCarrossel && (viewport ? viewport === "MOBILE" : true);

  return (
    <>
      {produtos.length > 0 && (
        <section className="flex flex-col gap-4 px-6">
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
            <h2 className={cn(tituloSecaoClassePorVariante[variante], classeAlinhamento(config.alinhamento))}>
              {config.titulo}
            </h2>
          </div>
          {exibirGrade && (
            <div
              className={cn(gridProdutosClassePorVariante[variante], layoutCarrossel && "max-md:hidden")}
              style={
                config.tamanhoImagem != null
                  ? { gridTemplateColumns: `repeat(auto-fill, minmax(${tamanhoImagemEmPx(config.tamanhoImagem)}px, 1fr))` }
                  : undefined
              }
            >
              {produtos.map((produto, indice) => (
                // Stagger: cada card entra um pouco depois do anterior, em vez
                // de todos juntos — ciclo de 8 pra não acumular atraso enorme
                // em grades grandes (o 9º card volta a ter o mesmo atraso do 1º).
                <RevealOnScroll key={produto.id} delayMs={(indice % 8) * 60}>
                  <ProductCard
                    produto={produto}
                    slug={slug}
                    variante={variantLower}
                    mostrarPreco={mostrarPreco}
                    corBotao={config.corBotao}
                    corTextoBotao={config.corTextoBotao}
                    maisVendido={topVendidosIds.has(produto.id)}
                  />
                </RevealOnScroll>
              ))}
            </div>
          )}
          {exibirCarrossel && (
            <div className={viewport ? undefined : "md:hidden"}>
              <ProductCarousel
                produtos={produtos}
                slug={slug}
                variante={variantLower}
                mostrarPreco={mostrarPreco}
                mostrarComprar={config.mostrarComprarCarrossel ?? true}
                corBotao={config.corBotao}
                corTextoBotao={config.corTextoBotao}
                idsMaisVendidos={topVendidosIds}
              />
            </div>
          )}
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

function SecaoSelos({ config }: { config: ConfigSelos }) {
  const itens = config.itens ?? [];
  if (itens.length === 0) return null;
  const tamanhoIcone = tamanhoIconeSeloEmPx(config.tamanhoIcone);
  const tamanhoTitulo = tamanhoFonteEmPx(config.tamanhoTitulo);
  return (
    <section
      className="mx-6 flex flex-wrap justify-center gap-x-10 gap-y-6 rounded-md border p-6"
      style={{ backgroundColor: config.corFundo }}
    >
      {itens.map((selo) => {
        const Icone = ICONE_POR_SELO[selo.icone ?? "QUALIDADE"];
        return (
          <div key={selo.id} className="flex max-w-[180px] flex-col items-center gap-1.5 text-center">
            <Icone
              className="text-muted-foreground shrink-0"
              style={{ width: tamanhoIcone, height: tamanhoIcone, color: config.corIcone }}
            />
            <span
              className="text-sm font-semibold tracking-wide uppercase"
              style={{ color: config.corTitulo, fontSize: tamanhoTitulo }}
            >
              <AnimatedNumberText text={selo.titulo} />
            </span>
            {selo.descricao && (
              <span className="text-muted-foreground text-xs" style={{ color: config.corTexto }}>
                <AnimatedNumberText text={selo.descricao} />
              </span>
            )}
          </div>
        );
      })}
    </section>
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
  viewport,
  selosConfig,
  rankingMaisVendidos,
}: {
  secoes: SecaoTema[];
  template: Variante;
  slug: string;
  categorias: Categoria[];
  destaques: Produto[];
  // Só usado no preview do editor de tema, pra forçar a versão mobile/desktop
  // do banner independente da largura real da janela. No site público, fica
  // undefined e o banner volta a decidir sozinho via CSS responsivo (md:).
  viewport?: "DESKTOP" | "MOBILE";
  // Conteúdo dos selos, compartilhado com a página de produto — a seção
  // SELOS só controla visibilidade/posição (ver Loja.selosConfig).
  selosConfig: ConfigSelos;
  // IDs de Produto ordenados por quantidade vendida (ver
  // lojaPublica.produtosMaisVendidos) — usado pelo modo MAIS_VENDIDOS da
  // Coleção em destaque. Sem seção nesse modo na página, fica undefined e
  // nenhuma query extra é feita (ver app/(public-store)/loja/[slug]/page.tsx).
  rankingMaisVendidos?: string[];
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
              <SecaoHero key={secao.id} variante={template} config={secao.config} slug={slug} viewport={viewport} />
            );
          case "MENU_CATEGORIAS":
            return (
              <RevealOnScroll key={secao.id}>
                <SecaoMenuCategorias
                  variante={template}
                  config={secao.config}
                  slug={slug}
                  categorias={categorias}
                  destaques={destaques}
                  viewport={viewport}
                />
              </RevealOnScroll>
            );
          case "COLECAO_DESTAQUE":
            return (
              <RevealOnScroll key={secao.id}>
                <SecaoColecaoDestaque
                  variante={template}
                  config={secao.config}
                  slug={slug}
                  destaques={destaques}
                  viewport={viewport}
                  rankingMaisVendidos={rankingMaisVendidos}
                />
              </RevealOnScroll>
            );
          case "TEXTO":
            return (
              <RevealOnScroll key={secao.id}>
                <SecaoTexto config={secao.config} />
              </RevealOnScroll>
            );
          case "SELOS":
            return (
              <RevealOnScroll key={secao.id}>
                <SecaoSelos config={selosConfig} />
              </RevealOnScroll>
            );
          case "BANNER_SECUNDARIO":
            return (
              <RevealOnScroll key={secao.id}>
                <SecaoBannerSecundario
                  variante={template}
                  config={secao.config}
                  slug={slug}
                  viewport={viewport}
                />
              </RevealOnScroll>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
