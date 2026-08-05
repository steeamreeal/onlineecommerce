import { prisma } from "@/server/db/client";

// app/favicon.ico (convenção estática) tem prioridade sobre o `icons` de
// generateMetadata em layout.tsx, então o favicon da loja nunca aparecia —
// só um arquivo de ícone na própria pasta da rota (esta convenção) vence o
// favicon.ico global. Repassa os bytes da logo (Supabase Storage) para o
// navegador em vez de redirecionar, já que o <link rel="icon"> gerado por
// essa convenção precisa apontar para uma rota do próprio domínio.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loja = await prisma.loja.findUnique({ where: { slug }, select: { logoUrl: true } });

  if (!loja?.logoUrl) {
    return new Response(null, { status: 404 });
  }

  const resposta = await fetch(loja.logoUrl);
  if (!resposta.ok || !resposta.body) {
    return new Response(null, { status: 404 });
  }

  return new Response(resposta.body, {
    headers: {
      "Content-Type": resposta.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
