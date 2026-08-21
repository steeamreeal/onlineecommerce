"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { CATEGORIAS_SUGERIDAS } from "@/lib/categorias-sugeridas";

const SEM_CATEGORIA = "__sem_categoria__";

export function CategoriasLista() {
  const utils = trpc.useUtils();
  const { data: categorias = [], isLoading } = trpc.categorias.listar.useQuery();

  const [nomeNova, setNomeNova] = useState("");
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [destinoParaTodos, setDestinoParaTodos] = useState<string>(SEM_CATEGORIA);
  const [destinosPorProduto, setDestinosPorProduto] = useState<Record<string, string>>({});

  const nomesExistentes = new Set(categorias.map((c) => c.nome));

  const criar = trpc.categorias.criar.useMutation({
    onSuccess: () => {
      utils.categorias.listar.invalidate();
      setNomeNova("");
      toast.success("Categoria adicionada.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível adicionar a categoria.");
    },
  });

  const criarVarias = trpc.categorias.criarVarias.useMutation({
    onSuccess: (resultado) => {
      utils.categorias.listar.invalidate();
      setSelecionadas(new Set());
      setSugestoesAbertas(false);
      toast.success(
        resultado.criadas > 0
          ? `${resultado.criadas} categoria(s) adicionada(s).`
          : "Essas categorias já estavam cadastradas.",
      );
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível adicionar as categorias.");
    },
  });

  const { data: produtosDaCategoria = [], isLoading: carregandoProdutos } =
    trpc.categorias.produtosDaCategoria.useQuery(
      { id: categoriaParaExcluir?.id ?? "" },
      { enabled: !!categoriaParaExcluir },
    );

  const remover = trpc.categorias.remover.useMutation({
    onSuccess: () => {
      utils.categorias.listar.invalidate();
      toast.success("Categoria removida.");
      setCategoriaParaExcluir(null);
      setDestinosPorProduto({});
      setDestinoParaTodos(SEM_CATEGORIA);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível remover a categoria.");
    },
  });

  const outrasCategorias = categorias.filter((c) => c.id !== categoriaParaExcluir?.id);

  function abrirExclusao(categoria: { id: string; nome: string }) {
    setCategoriaParaExcluir(categoria);
    setDestinoParaTodos(SEM_CATEGORIA);
    setDestinosPorProduto({});
  }

  function aplicarDestinoATodos(valor: string | null) {
    if (!valor) return;
    setDestinoParaTodos(valor);
    const novo: Record<string, string> = {};
    for (const produto of produtosDaCategoria) {
      novo[produto.id] = valor;
    }
    setDestinosPorProduto(novo);
  }

  function confirmarExclusao() {
    if (!categoriaParaExcluir) return;
    const produtoDestinos: Record<string, string | null> = {};
    for (const produto of produtosDaCategoria) {
      const destino = destinosPorProduto[produto.id] ?? destinoParaTodos;
      produtoDestinos[produto.id] = destino === SEM_CATEGORIA ? null : destino;
    }
    remover.mutate({ id: categoriaParaExcluir.id, produtoDestinos });
  }

  function handleCriar() {
    const nome = nomeNova.trim();
    if (!nome) return;
    criar.mutate({ nome });
  }

  function alternarSelecao(nome: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(nome)) proximo.delete(nome);
      else proximo.add(nome);
      return proximo;
    });
  }

  function handleAdicionarSugeridas() {
    if (selecionadas.size === 0) return;
    criarVarias.mutate({ nomes: Array.from(selecionadas) });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-muted-foreground text-sm">
            Organize seus produtos em categorias para facilitar a navegação na loja.
          </p>
        </div>
        <Button variant="outline" onClick={() => setSugestoesAbertas(true)}>
          <Sparkles className="size-4" />
          Adicionar sugeridas
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nome da categoria"
          value={nomeNova}
          onChange={(e) => setNomeNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCriar();
            }
          }}
        />
        <Button onClick={handleCriar} disabled={criar.isPending || !nomeNova.trim()}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {isLoading && <Skeleton className="h-8 w-64" />}
        {!isLoading && categorias.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada ainda.</p>
        )}
        {!isLoading &&
          categorias.map((categoria) => (
            <Badge key={categoria.id} variant="secondary" className="gap-1 py-1.5 pr-1.5 pl-3">
              {categoria.nome}
              <button
                type="button"
                onClick={() => abrirExclusao(categoria)}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                aria-label={`Remover categoria ${categoria.nome}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
      </div>

      <Dialog open={sugestoesAbertas} onOpenChange={setSugestoesAbertas}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorias sugeridas</DialogTitle>
            <DialogDescription>
              Selecione as categorias que fazem sentido para sua loja. As que já existem aparecem
              desmarcadas e não são duplicadas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto py-2">
            {CATEGORIAS_SUGERIDAS.map((nome) => {
              const jaExiste = nomesExistentes.has(nome);
              return (
                <label
                  key={nome}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    jaExiste ? "opacity-50" : "cursor-pointer hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={jaExiste || selecionadas.has(nome)}
                    disabled={jaExiste}
                    onCheckedChange={() => alternarSelecao(nome)}
                  />
                  {nome}
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancelar</Button>} />
            <Button
              onClick={handleAdicionarSugeridas}
              disabled={criarVarias.isPending || selecionadas.size === 0}
            >
              {criarVarias.isPending ? "Adicionando..." : `Adicionar (${selecionadas.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!categoriaParaExcluir}
        onOpenChange={(aberto) => {
          if (!aberto) setCategoriaParaExcluir(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria "{categoriaParaExcluir?.nome}"</DialogTitle>
            <DialogDescription>
              {carregandoProdutos
                ? "Verificando produtos..."
                : produtosDaCategoria.length === 0
                  ? "Nenhum produto está nessa categoria. Ela pode ser excluída diretamente."
                  : `${produtosDaCategoria.length} produto(s) estão nessa categoria. Escolha para qual categoria cada um vai antes de excluir.`}
            </DialogDescription>
          </DialogHeader>

          {!carregandoProdutos && produtosDaCategoria.length > 0 && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <span className="text-sm font-medium">Mover todos para</span>
                <Select value={destinoParaTodos} onValueChange={aplicarDestinoATodos}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                    {outrasCategorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {produtosDaCategoria.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="truncate text-sm">{produto.nome}</span>
                    <Select
                      value={destinosPorProduto[produto.id] ?? destinoParaTodos}
                      onValueChange={(valor) => {
                        if (!valor) return;
                        setDestinosPorProduto((atual) => ({ ...atual, [produto.id]: valor }));
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                        {outrasCategorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancelar</Button>} />
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={remover.isPending || carregandoProdutos}
            >
              {remover.isPending ? "Excluindo..." : "Excluir categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
