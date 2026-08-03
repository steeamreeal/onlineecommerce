import { redirect, notFound } from "next/navigation";
import { prisma } from "@/server/db/client";

// Alvo do rewrite feito pelo middleware para domínio próprio (o Edge não
// tem como consultar o Prisma). Aqui, em runtime Node, resolve o host para
// o slug real da loja e redireciona — a URL final mostra /loja/{slug},
// então todo o restante do site público (carrinho, checkout, tRPC público)
// continua funcionando por slug sem nenhuma mudança.
export default async function ResolverDominioProprioPage({
  params,
}: {
  params: Promise<{ host: string; rest?: string[] }>;
}) {
  const { host, rest } = await params;

  const loja = await prisma.loja.findUnique({
    where: { dominioProprio: host.toLowerCase() },
    select: { slug: true },
  });

  if (!loja) {
    notFound();
  }

  const caminho = rest && rest.length > 0 ? `/${rest.join("/")}` : "";
  redirect(`/loja/${loja.slug}${caminho}`);
}
