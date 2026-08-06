import type { Metadata } from "next";
import { prisma } from "@/server/db/client";
import { CLASSE_FONTES_TEMA } from "@/lib/fontes-tema";
import LojaLayoutClient from "./loja-layout-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loja = await prisma.loja.findUnique({
    where: { slug },
    select: { nome: true },
  });

  if (!loja) return {};

  // O favicon dinâmico não entra em `icons` aqui: a URL da convenção de
  // arquivo (app/(public-store)/loja/[slug]/icon.tsx) tem um sufixo interno
  // gerado pelo Next (ex.: /loja/slug/icon-1jdiwo) que não deve ser
  // reconstruído manualmente — declarar a string errada aqui já quebrou o
  // favicon (404) numa tentativa anterior. O Next já injeta esse link
  // sozinho; o que falta é neutralizar app/favicon.ico nesta rota, feito em
  // app/(public-store)/layout.tsx.
  return { title: loja.nome };
}

export default function PublicStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    // display:contents — só propaga as CSS vars de fonte (herança normal
    // de custom property independe de geração de caixa), sem virar mais um
    // container no meio da árvore flex de LojaLayoutClient.
    <div className={`${CLASSE_FONTES_TEMA} contents`}>
      <LojaLayoutClient params={params}>{children}</LojaLayoutClient>
    </div>
  );
}
