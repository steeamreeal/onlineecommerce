"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Quantos produtos aparecem no dropdown — tanto na sugestão inicial (campo
// vazio, foco só de tocar/clicar) quanto filtrados por busca.
const LIMITE_SUGESTOES = 5;

/**
 * Campo de busca do cabeçalho com dropdown de sugestões: ao focar, já
 * mostra alguns produtos da loja (mais recentes) mesmo sem o cliente ter
 * digitado nada — conforme digita, a lista filtra pelo termo. Enter ou
 * clicar fora ainda funciona como antes (navega para /produtos?busca=...).
 */
export function BuscaProdutos({ slug }: { slug: string }) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sempre habilitada quando o dropdown está aberto — com valor vazio, o
  // router.produtos já cai no "sem filtro de busca" (mostra os mais
  // recentes), que é exatamente a sugestão inicial que queremos.
  const { data: produtos } = trpc.lojaPublica.produtos.useQuery(
    { slug, busca: valor.trim() || undefined },
    { enabled: aberto },
  );
  const sugestoes = (produtos ?? []).slice(0, LIMITE_SUGESTOES);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[200px] flex-1">
      <form action={`/loja/${slug}/produtos`} className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          name="busca"
          placeholder="Buscar produtos"
          className="pl-9"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onFocus={() => setAberto(true)}
          autoComplete="off"
        />
      </form>

      {aberto && sugestoes.length > 0 && (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-md border shadow-lg">
          <ul className="flex flex-col divide-y">
            {sugestoes.map((produto) => {
              const capa = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <li key={produto.id}>
                  <Link
                    href={`/loja/${slug}/produtos/${produto.id}`}
                    onClick={() => setAberto(false)}
                    className="hover:bg-accent flex items-center gap-3 px-3 py-2"
                  >
                    <div className="bg-muted size-10 shrink-0 overflow-hidden rounded-md">
                      {capa && capa.tipo === "IMAGEM" && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
                        <img src={capa.url} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm">{produto.nome}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatoMoeda.format(Number(produto.precoPromo ?? produto.precoNormal))}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {valor.trim() && (
            <Link
              href={`/loja/${slug}/produtos?busca=${encodeURIComponent(valor.trim())}`}
              onClick={() => setAberto(false)}
              className="hover:bg-accent border-t px-3 py-2 text-center text-sm font-medium block"
            >
              Ver todos os resultados
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
