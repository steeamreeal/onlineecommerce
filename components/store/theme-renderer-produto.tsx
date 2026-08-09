"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, CreditCard, RefreshCw, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { ProdutoGaleria } from "@/components/store/produto-galeria";
import { useCartOpcional } from "@/components/store/cart-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { tamanhoIconeSeloEmPx, tamanhoFonteEmPx } from "@/lib/tema-loja";
import { AnimatedNumberText } from "@/components/store/animated-number-text";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { SecaoProdutoTema, IconeSelo, AlinhamentoTexto, ConfigSelos } from "@/lib/tema-loja";

type Produto = RouterOutputs["lojaPublica"]["produtoPorId"];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const ICONE_POR_SELO: Record<IconeSelo, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ENTREGA: Truck,
  GARANTIA: ShieldCheck,
  PAGAMENTO: CreditCard,
  TROCA: RefreshCw,
  QUALIDADE: BadgeCheck,
};

const classeAlinhamento: Record<AlinhamentoTexto, string> = {
  ESQUERDA: "text-left",
  CENTRO: "text-center",
  DIREITA: "text-right",
};

function variacaoLabel(v: { cor?: string | null; tamanho?: string | null; modelo?: string | null }) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

function SecaoGaleria({
  produto,
  config,
  midiaSelecionadaId,
  onSelecionar,
}: {
  produto: Produto;
  config: Extract<SecaoProdutoTema, { tipo: "GALERIA_PRODUTO" }>["config"];
  midiaSelecionadaId: string | undefined;
  onSelecionar: (id: string) => void;
}) {
  const midias = [...produto.fotos].sort((a, b) => a.ordem - b.ordem);
  const midiaSelecionada = midias.find((m) => m.id === midiaSelecionadaId) ?? midias[0];
  const mostrarMiniaturas = config.mostrarMiniaturas ?? true;

  return (
    <div className="flex flex-col gap-3">
      <ProdutoGaleria
        midias={midias}
        midiaSelecionadaId={midiaSelecionada?.id}
        onSelecionar={onSelecionar}
        nomeProduto={produto.nome}
      />
      {mostrarMiniaturas && midias.length > 1 && (
        <div className="flex gap-2">
          {midias.map((midia) => (
            <button
              key={midia.id}
              type="button"
              onClick={() => onSelecionar(midia.id)}
              className={cn(
                "bg-muted size-16 shrink-0 overflow-hidden rounded-md border-2",
                midia.id === midiaSelecionada?.id ? "border-foreground" : "border-transparent",
              )}
            >
              {midia.tipo === "VIDEO" ? (
                <video src={midia.url} className="size-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
                <img src={midia.url} alt="" className="size-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SecaoInfo({
  produto,
  slug,
  config,
  variacaoId,
  onSelecionarVariacao,
}: {
  produto: Produto;
  slug: string;
  config: Extract<SecaoProdutoTema, { tipo: "INFO_PRODUTO" }>["config"];
  variacaoId: string | undefined;
  onSelecionarVariacao: (variacaoId: string, fotoId?: string | null) => void;
}) {
  // Opcional porque o preview do editor de tema roda sem CartProvider por
  // perto (ver useCartOpcional) — mesmo padrão do ProductCard.
  const cart = useCartOpcional();
  const semVariacoes = produto.variacoes.length === 0;
  const variacaoSelecionada = semVariacoes ? undefined : produto.variacoes.find((v) => v.id === variacaoId);
  const podeComprar = semVariacoes || Boolean(variacaoSelecionada);
  const preco = Number(produto.precoPromo ?? produto.precoNormal);

  function handleAdicionar() {
    if (!podeComprar || !cart) return;
    cart.adicionarItem({
      produtoId: produto.id,
      variacaoId: variacaoSelecionada?.id ?? produto.id,
      quantidade: 1,
      precoUnitario: preco,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {(config.mostrarBreadcrumb ?? true) && (
        <nav className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link href={`/loja/${slug}`} className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="size-3.5" />
          <Link
            href={`/loja/${slug}/produtos?categoria=${produto.categoriaId ?? ""}`}
            className="hover:text-foreground"
          >
            {produto.categoria?.nome ?? "Sem categoria"}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{produto.nome}</span>
        </nav>
      )}

      <div>
        <h1 className="text-2xl font-semibold" style={{ color: config.corTitulo }}>
          {produto.nome}
        </h1>
        {(config.mostrarDescricaoCurta ?? true) && produto.descricao && (
          <p className="text-muted-foreground mt-1 text-sm" style={{ color: config.corTexto }}>
            {produto.descricao}
          </p>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        {produto.precoPromo && (
          <span className="text-muted-foreground text-sm line-through">
            {formatoMoeda.format(Number(produto.precoNormal))}
          </span>
        )}
        <span className="text-2xl font-semibold" style={{ color: config.corPreco }}>
          {formatoMoeda.format(preco)}
        </span>
      </div>

      {produto.variacoes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Escolha uma opção</span>
          <div className="flex flex-wrap gap-2">
            {produto.variacoes.map((variacao) => {
              const esgotada = variacao.estoque === 0;
              const selecionada = variacao.id === variacaoId;
              return (
                <button
                  key={variacao.id}
                  type="button"
                  disabled={esgotada}
                  onClick={() => onSelecionarVariacao(variacao.id, variacao.fotoId)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    selecionada ? "border-primary bg-primary/5" : "hover:border-primary/40",
                    esgotada && "text-muted-foreground cursor-not-allowed line-through opacity-50",
                  )}
                >
                  {variacaoLabel(variacao)}
                  {esgotada ? " (esgotado)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!podeComprar}
        onClick={handleAdicionar}
        style={
          podeComprar && config.corBotao
            ? { backgroundColor: config.corBotao, color: config.corTextoBotao }
            : undefined
        }
      >
        {podeComprar ? config.textoBotao || "Adicionar ao carrinho" : config.textoBotaoEsgotado || "Produto esgotado"}
      </Button>

      {/* Reforço de confiança fixo, perto do botão — diferente da seção SELOS
          (configurável, geralmente mais abaixo na página), isso é sempre
          mostrado, sem depender do lojista ter configurado selos. */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 shrink-0" />
          Compra 100% segura
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="size-3.5 shrink-0" />
          Pix, cartão ou boleto
        </span>
      </div>
    </div>
  );
}

function SecaoDescricao({
  produto,
  config,
}: {
  produto: Produto;
  config: Extract<SecaoProdutoTema, { tipo: "DESCRICAO_PRODUTO" }>["config"];
}) {
  if (!produto.descricao) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{config.titulo || "Descrição"}</h2>
      <p className="text-muted-foreground text-sm whitespace-pre-line">{produto.descricao}</p>
    </section>
  );
}

function SecaoSelos({ config }: { config: ConfigSelos }) {
  const itens = config.itens ?? [];
  if (itens.length === 0) return null;
  const tamanhoIcone = tamanhoIconeSeloEmPx(config.tamanhoIcone);
  const tamanhoTitulo = tamanhoFonteEmPx(config.tamanhoTitulo);
  return (
    <section
      className="flex flex-wrap justify-center gap-x-10 gap-y-6 rounded-md border p-6"
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

function SecaoTexto({ config }: { config: Extract<SecaoProdutoTema, { tipo: "TEXTO_PRODUTO" }>["config"] }) {
  return (
    <section className={cn("flex flex-col gap-2", classeAlinhamento[config.alinhamento ?? "ESQUERDA"])}>
      {config.titulo && <h2 className="text-base font-medium">{config.titulo}</h2>}
      <p className="text-muted-foreground text-sm whitespace-pre-line">{config.corpo}</p>
    </section>
  );
}

// Scroll horizontal com setas, mostrando vários cards por vez em qualquer
// tamanho de tela — diferente do ProductCarousel da home (Coleção em
// destaque), que é um produto só por slide e existe só no mobile.
function CarrosselRelacionados({
  produtos,
  slug,
  corBotao,
  corTextoBotao,
}: {
  produtos: Produto[];
  slug: string;
  corBotao?: string;
  corTextoBotao?: string;
}) {
  const trilhaRef = useRef<HTMLDivElement>(null);

  function rolar(direcao: -1 | 1) {
    trilhaRef.current?.scrollBy({ left: direcao * trilhaRef.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="group relative">
      <div
        ref={trilhaRef}
        className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {produtos.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48 lg:w-56">
            <ProductCard produto={p} slug={slug} corBotao={corBotao} corTextoBotao={corTextoBotao} />
          </div>
        ))}
      </div>
      {produtos.length > 2 && (
        <>
          <button
            type="button"
            onClick={() => rolar(-1)}
            aria-label="Produtos anteriores"
            className="bg-background absolute top-[38%] -left-3 hidden -translate-y-1/2 rounded-full border p-1.5 shadow-sm group-hover:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            aria-label="Próximos produtos"
            className="bg-background absolute top-[38%] -right-3 hidden -translate-y-1/2 rounded-full border p-1.5 shadow-sm group-hover:flex"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

function SecaoRelacionados({
  produto,
  slug,
  config,
}: {
  produto: Produto;
  slug: string;
  config: Extract<SecaoProdutoTema, { tipo: "RELACIONADOS_PRODUTO" }>["config"];
}) {
  const modo = config.modo ?? "CATEGORIA";
  // CATEGORIA filtra no servidor (categoriaId); MANUAL/ALEATORIO precisam do
  // catálogo inteiro da loja pra escolher/sortear entre todos os produtos,
  // não só os da mesma categoria do produto atual.
  const { data: produtosBrutos } = trpc.lojaPublica.produtos.useQuery({
    slug,
    categoriaId: modo === "CATEGORIA" ? (produto.categoriaId ?? undefined) : undefined,
  });
  const disponiveis = (produtosBrutos ?? []).filter((p) => p.id !== produto.id);
  const idsDisponiveis = disponiveis.map((p) => p.id).join(",");

  // Math.random não pode rodar durante o render (regra de pureza do React) —
  // o sorteio roda num efeito, guardando só a ORDEM (ids) em vez do array de
  // produtos, e refaz o sorteio apenas quando a lista de disponíveis muda
  // (não a cada re-render da página, senão os cards pulariam de posição
  // toda vez que o cliente trocasse de variação, por exemplo).
  const [ordemAleatoria, setOrdemAleatoria] = useState<string[] | null>(null);
  useEffect(() => {
    if (modo !== "ALEATORIO") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Math.random é uma fonte externa/impura de propósito — sortear a ordem é exatamente o que esse efeito sincroniza
    setOrdemAleatoria([...idsDisponiveis.split(",")].filter(Boolean).sort(() => Math.random() - 0.5));
  }, [modo, idsDisponiveis]);

  const relacionadosBase = useMemo(() => {
    if (modo === "MANUAL") {
      const porId = new Map(disponiveis.map((p) => [p.id, p]));
      return (config.produtosSelecionados ?? [])
        .map((id) => porId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    }
    if (modo === "ALEATORIO") {
      const porId = new Map(disponiveis.map((p) => [p.id, p]));
      // Antes do efeito rodar (primeiro render), cai na ordem original —
      // só um flash inicial, sem impacto real.
      return (ordemAleatoria ?? disponiveis.map((p) => p.id))
        .map((id) => porId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    }
    return disponiveis;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depende da lista de ids disponíveis (idsDisponiveis), não do array `disponiveis` em si, que é recriado a cada render
  }, [modo, idsDisponiveis, config.produtosSelecionados, ordemAleatoria]);

  const relacionados = config.quantidade ? relacionadosBase.slice(0, config.quantidade) : relacionadosBase;

  if (relacionados.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{config.titulo || "Você também pode gostar"}</h2>
      {(config.layout ?? "GRADE") === "CARROSSEL" ? (
        <CarrosselRelacionados
          produtos={relacionados}
          slug={slug}
          corBotao={config.corBotao}
          corTextoBotao={config.corTextoBotao}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {relacionados.map((p) => (
            <ProductCard
              key={p.id}
              produto={p}
              slug={slug}
              corBotao={config.corBotao}
              corTextoBotao={config.corTextoBotao}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Monta a página pública de um produto a partir de Loja.temaProdutoConfig —
 * mesmo padrão do ThemeRenderer da home (lista ordenada de seções,
 * despachadas por tipo), aplicado a TODOS os produtos da loja de uma vez, já
 * que não existe personalização por produto individual.
 */
export function ThemeRendererProduto({
  produto,
  slug,
  secoes,
  selosConfig,
}: {
  produto: Produto;
  slug: string;
  secoes: SecaoProdutoTema[];
  selosConfig: ConfigSelos;
}) {
  const midias = [...produto.fotos].sort((a, b) => a.ordem - b.ordem);
  const [midiaSelecionadaId, setMidiaSelecionadaId] = useState<string | undefined>(midias[0]?.id);
  const [variacaoId, setVariacaoId] = useState<string | undefined>(
    produto.variacoes.find((v) => v.estoque > 0)?.id,
  );

  const secaoGaleria = secoes.find((s) => s.tipo === "GALERIA_PRODUTO" && s.visivel);
  const secaoInfo = secoes.find((s) => s.tipo === "INFO_PRODUTO" && s.visivel);
  const demaisSecoes = secoes.filter((s) => s.tipo !== "GALERIA_PRODUTO" && s.tipo !== "INFO_PRODUTO" && s.visivel);

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {secaoGaleria && secaoGaleria.tipo === "GALERIA_PRODUTO" ? (
          <SecaoGaleria
            produto={produto}
            config={secaoGaleria.config}
            midiaSelecionadaId={midiaSelecionadaId}
            onSelecionar={setMidiaSelecionadaId}
          />
        ) : (
          <div />
        )}

        {secaoInfo && secaoInfo.tipo === "INFO_PRODUTO" && (
          <SecaoInfo
            produto={produto}
            slug={slug}
            config={secaoInfo.config}
            variacaoId={variacaoId}
            onSelecionarVariacao={(id, fotoId) => {
              setVariacaoId(id);
              if (fotoId) setMidiaSelecionadaId(fotoId);
            }}
          />
        )}
      </div>

      {demaisSecoes.map((secao) => {
        switch (secao.tipo) {
          case "DESCRICAO_PRODUTO":
            return <SecaoDescricao key={secao.id} produto={produto} config={secao.config} />;
          case "SELOS_PRODUTO":
            return <SecaoSelos key={secao.id} config={selosConfig} />;
          case "TEXTO_PRODUTO":
            return <SecaoTexto key={secao.id} config={secao.config} />;
          case "RELACIONADOS_PRODUTO":
            return <SecaoRelacionados key={secao.id} produto={produto} slug={slug} config={secao.config} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
