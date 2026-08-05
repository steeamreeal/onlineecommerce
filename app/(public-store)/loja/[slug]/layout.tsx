import type { Metadata } from "next";
import { prisma } from "@/server/db/client";
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

  // O favicon dinâmico não entra aqui: app/favicon.ico (convenção estática)
  // vence qualquer `icons` retornado por generateMetadata, então a logo da
  // loja é servida via icon.tsx nesta mesma pasta (convenção de arquivo,
  // que tem prioridade sobre o favicon.ico global).
  return { title: loja.nome };
}

export default function PublicStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <LojaLayoutClient params={params}>{children}</LojaLayoutClient>;
}
