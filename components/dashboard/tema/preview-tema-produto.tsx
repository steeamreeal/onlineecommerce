"use client";

import { ThemeRendererProduto } from "@/components/store/theme-renderer-produto";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { SecaoProdutoTema, ConfigSelos } from "@/lib/tema-loja";

type Produto = RouterOutputs["lojaPublica"]["produtos"][number];

/**
 * Preview ao vivo da página de produto dentro do editor — mesmo
 * ThemeRendererProduto do site público, usando o primeiro produto cadastrado
 * na loja como exemplo (não existe "produto de mentira" no schema). A seleção
 * de seção acontece pela lista à esquerda (não há clique direto no preview
 * aqui, diferente do editor da home, porque Galeria+Informações sempre
 * renderizam juntas no mesmo grid de 2 colunas — recortar por seção
 * quebraria esse layout).
 */
export function PreviewTemaProduto({
  produto,
  slug,
  secoes,
  selosConfig,
}: {
  produto: Produto | undefined;
  slug: string;
  secoes: SecaoProdutoTema[];
  selosConfig: ConfigSelos;
}) {
  if (!produto) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
        Cadastre pelo menos um produto para poder visualizar a página de produto aqui.
      </div>
    );
  }

  return (
    <div className="bg-muted/30 flex min-h-0 flex-1 justify-center overflow-y-auto p-6">
      <div className="min-h-full w-full max-w-3xl overflow-hidden rounded-md border bg-background shadow-sm">
        <ThemeRendererProduto produto={produto} slug={slug} secoes={secoes} selosConfig={selosConfig} />
      </div>
    </div>
  );
}
