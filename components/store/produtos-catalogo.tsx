"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/store/product-card";
import { categoriasMock, produtosMock } from "@/lib/mocks/produtos";

const TODAS = "TODAS";

export function ProdutosCatalogo({
  slug,
  categoriaInicial,
  buscaInicial,
}: {
  slug: string;
  categoriaInicial?: string;
  buscaInicial?: string;
}) {
  const [busca, setBusca] = useState(buscaInicial ?? "");
  const [categoriaId, setCategoriaId] = useState(categoriaInicial ?? TODAS);
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");

  const categoriaSelectItems = [
    { value: TODAS, label: "Todas as categorias" },
    ...categoriasMock.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
  ];

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const min = precoMin ? Number(precoMin) : undefined;
    const max = precoMax ? Number(precoMax) : undefined;

    return produtosMock.filter((produto) => {
      if (produto.status === "INATIVO") return false;
      const preco = produto.precoPromo ?? produto.precoNormal;
      const bateBusca = termo.length === 0 || produto.nome.toLowerCase().includes(termo);
      const bateCategoria = categoriaId === TODAS || produto.categoriaId === categoriaId;
      const batePrecoMin = min === undefined || preco >= min;
      const batePrecoMax = max === undefined || preco <= max;
      return bateBusca && bateCategoria && batePrecoMin && batePrecoMax;
    });
  }, [busca, categoriaId, precoMin, precoMax]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <p className="text-muted-foreground text-sm">
          {produtosFiltrados.length} produto{produtosFiltrados.length === 1 ? "" : "s"} encontrado
          {produtosFiltrados.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produtos"
            className="pl-9"
          />
        </div>
        <Select
          items={categoriaSelectItems}
          value={categoriaId}
          onValueChange={(v) => setCategoriaId(v ?? TODAS)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as categorias</SelectItem>
            {categoriasMock.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            placeholder="Preço mín."
            value={precoMin}
            onChange={(e) => setPrecoMin(e.target.value)}
            className="w-28"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="number"
            min="0"
            placeholder="Preço máx."
            value={precoMax}
            onChange={(e) => setPrecoMax(e.target.value)}
            className="w-28"
          />
        </div>
      </div>

      {produtosFiltrados.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Nenhum produto encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produtosFiltrados.map((produto) => (
            <ProductCard key={produto.id} produto={produto} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
