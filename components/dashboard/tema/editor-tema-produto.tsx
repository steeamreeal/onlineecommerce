"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Info,
  FileText,
  BadgeCheck,
  Type,
  Grid3x3,
  Plus,
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
import { PreviewTemaProduto } from "@/components/dashboard/tema/preview-tema-produto";
import { PainelPropriedadesProduto } from "@/components/dashboard/tema/painel-propriedades-produto";
import {
  NOMES_TIPO_SECAO_PRODUTO,
  TIPOS_SECAO_PRODUTO_FIXA,
  criarTemaProdutoConfigPadrao,
  type SecaoProdutoTema,
  type TemaProdutoConfig,
  type TipoSecaoProdutoTema,
} from "@/lib/tema-loja";

const ICONE_POR_TIPO: Record<TipoSecaoProdutoTema, React.ComponentType<{ className?: string }>> = {
  GALERIA_PRODUTO: ImageIcon,
  INFO_PRODUTO: Info,
  DESCRICAO_PRODUTO: FileText,
  SELOS_PRODUTO: BadgeCheck,
  TEXTO_PRODUTO: Type,
  RELACIONADOS_PRODUTO: Grid3x3,
};

const TIPOS_ADICIONAVEIS: TipoSecaoProdutoTema[] = [
  "DESCRICAO_PRODUTO",
  "SELOS_PRODUTO",
  "TEXTO_PRODUTO",
  "RELACIONADOS_PRODUTO",
];

function novaSecao(tipo: TipoSecaoProdutoTema): SecaoProdutoTema {
  const id = crypto.randomUUID();
  switch (tipo) {
    case "DESCRICAO_PRODUTO":
      return { id, tipo, visivel: true, config: { titulo: "Descrição" } };
    case "SELOS_PRODUTO":
      return { id, tipo, visivel: true, config: { itens: [] } };
    case "TEXTO_PRODUTO":
      return { id, tipo, visivel: true, config: { corpo: "", alinhamento: "ESQUERDA" } };
    case "RELACIONADOS_PRODUTO":
      return {
        id,
        tipo,
        visivel: true,
        config: { titulo: "Você também pode gostar", modo: "CATEGORIA", layout: "GRADE" },
      };
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
  secao: SecaoProdutoTema;
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
          {NOMES_TIPO_SECAO_PRODUTO[secao.tipo]}
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

export function EditorTemaProduto() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery(
    { slug: loja?.slug ?? "" },
    { enabled: Boolean(loja?.slug) },
  );

  const [tema, setTema] = useState<TemaProdutoConfig | null>(null);
  const [selecaoId, setSelecaoId] = useState<string | null>(null);

  useEffect(() => {
    if (!loja || tema) return;
    const salvo = loja.temaProdutoConfig as TemaProdutoConfig | null;
    setTema(salvo ?? criarTemaProdutoConfigPadrao());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve rodar quando `loja` chega pela primeira vez, não a cada re-render
  }, [loja]);

  const salvarTema = trpc.loja.atualizarTemaProduto.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Página de produto salva com sucesso.");
    },
    onError: (erro) => toast.error(erro.message || "Não foi possível salvar."),
  });

  if (isLoading || !loja || !tema) {
    return <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">Carregando…</div>;
  }

  const secaoSelecionada = tema.secoes.find((s) => s.id === selecaoId) ?? null;
  const secoesFixas = tema.secoes.filter((s) => TIPOS_SECAO_PRODUTO_FIXA.includes(s.tipo));
  const secoesModelo = tema.secoes.filter((s) => !TIPOS_SECAO_PRODUTO_FIXA.includes(s.tipo));
  const produtoExemplo = (produtos ?? [])[0];

  function atualizarSecao(secaoAtualizada: SecaoProdutoTema) {
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
      if (
        TIPOS_SECAO_PRODUTO_FIXA.includes(atual.secoes[alvo].tipo) !==
        TIPOS_SECAO_PRODUTO_FIXA.includes(atual.secoes[indice].tipo)
      ) {
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

  function adicionarSecao(tipo: TipoSecaoProdutoTema) {
    const secao = novaSecao(tipo);
    setTema((atual) => (atual ? { ...atual, secoes: [...atual.secoes, secao] } : atual));
    setSelecaoId(secao.id);
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height,0px))] flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => window.close()} aria-label="Fechar editor">
            <X className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Editor da página de produto</h1>
            <p className="text-muted-foreground text-xs">
              Vale para todos os produtos da loja — não é possível personalizar produto por produto.
            </p>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href="/painel/tema/editar" />}>
            Editar página inicial
          </Button>
        </div>
        <Button size="sm" onClick={() => salvarTema.mutate(tema)} disabled={salvarTema.isPending}>
          {salvarTema.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3">
          <p className="text-muted-foreground px-2 pt-1 pb-1 text-xs font-medium">Fixas</p>
          {secoesFixas.map((secao) => (
            <ItemSecao
              key={secao.id}
              secao={secao}
              selecionada={selecaoId === secao.id}
              podeSubir={false}
              podeDescer={false}
              fixa
              onSelecionar={() => setSelecaoId(secao.id)}
              onMover={() => {}}
              onToggleVisivel={() => {}}
              onRemover={() => {}}
            />
          ))}

          <p className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-medium">Blocos extras</p>
          {secoesModelo.map((secao, i) => (
            <ItemSecao
              key={secao.id}
              secao={secao}
              selecionada={selecaoId === secao.id}
              podeSubir={i > 0}
              podeDescer={i < secoesModelo.length - 1}
              fixa={false}
              onSelecionar={() => setSelecaoId(secao.id)}
              onMover={(direcao) => moverSecao(secao.id, direcao)}
              onToggleVisivel={() => alternarVisibilidade(secao.id)}
              onRemover={() => removerSecao(secao.id)}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="text-primary flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:underline">
              <Plus className="size-4" />
              Adicionar bloco
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TIPOS_ADICIONAVEIS.map((tipo) => (
                <DropdownMenuItem key={tipo} onClick={() => adicionarSecao(tipo)}>
                  {NOMES_TIPO_SECAO_PRODUTO[tipo]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </aside>

        <PreviewTemaProduto produto={produtoExemplo} slug={loja.slug} secoes={tema.secoes} />

        <PainelPropriedadesProduto
          secaoSelecionada={secaoSelecionada}
          onChangeSecao={atualizarSecao}
          onFechar={() => setSelecaoId(null)}
        />
      </div>
    </div>
  );
}
