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
    select: { nome: true, logoUrl: true },
  });

  if (!loja) return {};

  return {
    title: loja.nome,
    icons: loja.logoUrl ? { icon: loja.logoUrl } : undefined,
  };
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
