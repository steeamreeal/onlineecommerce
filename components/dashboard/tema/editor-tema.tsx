"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Megaphone,
  Image as ImageIcon,
  LayoutGrid,
  Type,
  PanelBottom,
  PanelTop,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { PreviewTema } from "@/components/dashboard/tema/preview-tema";
import { PainelPropriedades } from "@/components/dashboard/tema/painel-propriedades";
import {
  NOMES_TIPO_SECAO,
  TIPOS_SECAO_FIXA,
  criarTemaConfigPadrao,
  type SecaoTema,
  type TemaConfig,
  type TipoSecaoTema,
  type BannerTema,
} from "@/lib/tema-loja";

const ICONE_POR_TIPO: Record<TipoSecaoTema, React.ComponentType<{ className?: string }>> = {
  BARRA_ANUNCIO: Megaphone,
  CABECALHO: PanelTop,
  HERO: ImageIcon,
  COLECAO_DESTAQUE: LayoutGrid,
  TEXTO: Type,
  RODAPE: PanelBottom,
};

const TIPOS_ADICIONAVEIS: TipoSecaoTema[] = ["HERO", "COLECAO_DESTAQUE", "TEXTO"];

function novaSecao(tipo: TipoSecaoTema): SecaoTema {
  const id = crypto.randomUUID();
  switch (tipo) {
    case "HERO":
      return { id, tipo, visivel: true, config: { banners: [], alinhamento: "ESQUERDA" } };
    case "COLECAO_DESTAQUE":
      return {
        id,
        tipo,
        visivel: true,
        config: { titulo: "Produtos", linkVerTudo: true, alinhamento: "ESQUERDA" },
      };
    case "TEXTO":
      return { id, tipo, visivel: true, config: { corpo: "", alinhamento: "ESQUERDA" } };
    default:
      throw new Error(`Tipo de seção não pode ser adicionado manualmente: ${tipo}`);
  }
}

function ItemSecao({
  secao,
  selecionada,
  podeSubir,
  podeDescer,
  fixa,
  onSelecionar,
  onMover,
  onToggleVisivel,
  onRemover,
}: {
  secao: SecaoTema;
  selecionada: boolean;
  podeSubir: boolean;
  podeDescer: boolean;
  fixa: boolean;
  onSelecionar: () => void;
  onMover: (direcao: -1 | 1) => void;
  onToggleVisivel: () => void;
  onRemover: () => void;
}) {
  const Icone = ICONE_POR_TIPO[secao.tipo];

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        selecionada ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50",
      )}
    >
      <button type="button" onClick={onSelecionar} className="flex flex-1 items-center gap-2 text-left">
        <Icone className="size-4 shrink-0" />
        <span className={cn("truncate", !secao.visivel && "text-muted-foreground line-through")}>
          {NOMES_TIPO_SECAO[secao.tipo]}
        </span>
      </button>
      <div className="hidden items-center gap-0.5 group-hover:flex">
        {!fixa && (
          <>
            <button
              type="button"
              disabled={!podeSubir}
              onClick={() => onMover(-1)}
              className="disabled:opacity-30"
              aria-label="Mover para cima"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={!podeDescer}
              onClick={() => onMover(1)}
              className="disabled:opacity-30"
              aria-label="Mover para baixo"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </>
        )}
        <button type="button" onClick={onToggleVisivel} aria-label="Alternar visibilidade">
          {secao.visivel ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
        {!fixa && (
          <button type="button" onClick={onRemover} aria-label="Remover seção">
            <Trash2 className="text-destructive size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function EditorTema() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const { data: categorias } = trpc.lojaPublica.categorias.useQuery(
    { slug: loja?.slug ?? "" },
    { enabled: Boolean(loja?.slug) },
  );

  const [tema, setTema] = useState<TemaConfig | null>(null);
  const [template, setTemplate] = useState<"MINIMALISTA" | "EDITORIAL" | "VITRINE">("MINIMALISTA");
  const [selecaoId, setSelecaoId] = useState<string | null>(null);
  const [mostrandoEstilo, setMostrandoEstilo] = useState(false);

  // Inicializa o estado local a partir do que está salvo (ou de um padrão
  // migrado dos banners antigos, se a loja nunca abriu o editor) — só uma
  // vez, quando os dados chegam; depois disso o estado é só local até salvar.
  useEffect(() => {
    if (!loja || tema) return;
    const salvo = loja.temaConfig as TemaConfig | null;
    setTema(
      salvo ??
        criarTemaConfigPadrao({
          corPrimaria: loja.corPrimaria,
          bannersAntigos: (loja.banners as BannerTema[] | null) ?? [],
        }),
    );
    setTemplate(loja.template);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve rodar quando `loja` chega pela primeira vez, não a cada re-render
  }, [loja]);

  const salvarTema = trpc.loja.atualizarTema.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Tema salvo com sucesso.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível salvar o tema."),
  });

  const salvarTemplate = trpc.loja.atualizarPersonalizacao.useMutation({
    onError: (erro) => toast.error(erro.message || "Não foi possível salvar o template."),
  });

  if (isLoading || !loja || !tema) {
    return <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">Carregando…</div>;
  }

  const secaoSelecionada = tema.secoes.find((s) => s.id === selecaoId) ?? null;
  const secoesFixas = tema.secoes.filter((s) => TIPOS_SECAO_FIXA.includes(s.tipo));
  const secoesModelo = tema.secoes.filter((s) => !TIPOS_SECAO_FIXA.includes(s.tipo));

  function atualizarSecao(secaoAtualizada: SecaoTema) {
    setTema((atual) =>
      atual
        ? { ...atual, secoes: atual.secoes.map((s) => (s.id === secaoAtualizada.id ? secaoAtualizada : s)) }
        : atual,
    );
  }

  function moverSecao(id: string, direcao: -1 | 1) {
    setTema((atual) => {
      if (!atual) return atual;
      const indice = atual.secoes.findIndex((s) => s.id === id);
      const alvo = indice + direcao;
      if (indice < 0 || alvo < 0 || alvo >= atual.secoes.length) return atual;
      // Seções fixas nunca trocam de posição com seções do modelo — só
      // reordena dentro do mesmo grupo (mesma trava da árvore da Shopify).
      if (TIPOS_SECAO_FIXA.includes(atual.secoes[alvo].tipo) !== TIPOS_SECAO_FIXA.includes(atual.secoes[indice].tipo)) {
        return atual;
      }
      const secoes = [...atual.secoes];
      [secoes[indice], secoes[alvo]] = [secoes[alvo], secoes[indice]];
      return { ...atual, secoes };
    });
  }

  function alternarVisibilidade(id: string) {
    setTema((atual) =>
      atual ? { ...atual, secoes: atual.secoes.map((s) => (s.id === id ? { ...s, visivel: !s.visivel } : s)) } : atual,
    );
  }

  function removerSecao(id: string) {
    setTema((atual) => (atual ? { ...atual, secoes: atual.secoes.filter((s) => s.id !== id) } : atual));
    if (selecaoId === id) setSelecaoId(null);
  }

  function adicionarSecao(tipo: TipoSecaoTema) {
    const secao = novaSecao(tipo);
    setTema((atual) => {
      if (!atual) return atual;
      // Insere antes do Rodapé (última seção fixa), mantendo-o sempre por último.
      const indiceRodape = atual.secoes.findIndex((s) => s.tipo === "RODAPE");
      const secoes = [...atual.secoes];
      if (indiceRodape === -1) secoes.push(secao);
      else secoes.splice(indiceRodape, 0, secao);
      return { ...atual, secoes };
    });
    setSelecaoId(secao.id);
    setMostrandoEstilo(false);
  }

  function selecionarSecao(id: string) {
    setSelecaoId(id);
    setMostrandoEstilo(false);
  }

  function salvar() {
    if (!loja || !tema) return;
    salvarTema.mutate(tema);
    if (template !== loja.template) {
      salvarTemplate.mutate({ template, corPrimaria: tema.estilo.corPrimaria });
    }
  }

  const listaCategorias = (categorias ?? []).map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="flex h-[calc(100vh-var(--header-height,0px))] flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.close()}
            aria-label="Fechar editor"
          >
            <X className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Editor de tema</h1>
            <p className="text-muted-foreground text-xs">Personalize a página inicial da sua loja</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={salvar}
          disabled={salvarTema.isPending || salvarTemplate.isPending}
        >
          {salvarTema.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3">
          <button
            type="button"
            onClick={() => {
              setMostrandoEstilo(true);
              setSelecaoId(null);
            }}
            className={cn(
              "mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              mostrandoEstilo ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50",
            )}
          >
            <Settings className="size-4" />
            Configurações do tema
          </button>

          <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">Cabeçalho</p>
          {secoesFixas
            .filter((s) => s.tipo !== "RODAPE")
            .map((secao) => (
              <ItemSecao
                key={secao.id}
                secao={secao}
                selecionada={selecaoId === secao.id}
                podeSubir={false}
                podeDescer={false}
                fixa
                onSelecionar={() => selecionarSecao(secao.id)}
                onMover={() => {}}
                onToggleVisivel={() => alternarVisibilidade(secao.id)}
                onRemover={() => {}}
              />
            ))}

          <p className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-medium">Modelo</p>
          {secoesModelo.map((secao, i) => (
            <ItemSecao
              key={secao.id}
              secao={secao}
              selecionada={selecaoId === secao.id}
              podeSubir={i > 0}
              podeDescer={i < secoesModelo.length - 1}
              fixa={false}
              onSelecionar={() => selecionarSecao(secao.id)}
              onMover={(direcao) => moverSecao(secao.id, direcao)}
              onToggleVisivel={() => alternarVisibilidade(secao.id)}
              onRemover={() => removerSecao(secao.id)}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-primary flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:underline"
            >
              <Plus className="size-4" />
              Adicionar seção
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TIPOS_ADICIONAVEIS.map((tipo) => (
                <DropdownMenuItem key={tipo} onClick={() => adicionarSecao(tipo)}>
                  {NOMES_TIPO_SECAO[tipo]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <p className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-medium">Rodapé</p>
          {secoesFixas
            .filter((s) => s.tipo === "RODAPE")
            .map((secao) => (
              <ItemSecao
                key={secao.id}
                secao={secao}
                selecionada={selecaoId === secao.id}
                podeSubir={false}
                podeDescer={false}
                fixa
                onSelecionar={() => selecionarSecao(secao.id)}
                onMover={() => {}}
                onToggleVisivel={() => alternarVisibilidade(secao.id)}
                onRemover={() => {}}
              />
            ))}
        </aside>

        <PreviewTema
          slug={loja.slug}
          nomeLoja={loja.nome}
          logoUrl={loja.logoUrl}
          secoes={tema.secoes}
          template={template}
          corPrimaria={tema.estilo.corPrimaria}
          secaoSelecionadaId={selecaoId}
          onSelecionarSecao={(id) => selecionarSecao(id)}
        />

        <PainelPropriedades
          secaoSelecionada={secaoSelecionada}
          mostrandoEstilo={mostrandoEstilo}
          estilo={tema.estilo}
          template={template}
          categorias={listaCategorias}
          onChangeSecao={atualizarSecao}
          onChangeEstilo={(estilo) => setTema((atual) => (atual ? { ...atual, estilo } : atual))}
          onChangeTemplate={setTemplate}
          onFechar={() => {
            setSelecaoId(null);
            setMostrandoEstilo(false);
          }}
        />
      </div>
    </div>
  );
}
