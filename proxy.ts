import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Resolve o tenant pelo host da request, sem acessar o banco (o driver do
// Prisma usa TCP direto via `pg`, incompatível com o runtime Edge do
// proxy/middleware). Dois casos:
// - {slug}.PLATAFORMA → o slug já está no próprio host, então dá pra
//   reescrever direto para /loja/{slug} sem nenhuma consulta.
// - domínio próprio do lojista → não tem como saber o slug aqui; a request
//   é reescrita para uma rota Node (/loja/dominio-proprio/[host]) que
//   resolve o slug via Prisma e redireciona para /loja/{slug}.
function resolverTenantPorHost(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const plataforma = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.split(":")[0]?.toLowerCase();
  if (!host || !plataforma) return null;

  const { pathname } = request.nextUrl;

  // Já dentro de /loja/... (inclusive a rota interna /loja/dominio-proprio)
  // — nunca reescrever de novo, senão entra em loop.
  if (pathname.startsWith("/loja/")) {
    return null;
  }

  if (host === plataforma || host === `www.${plataforma}`) {
    return null;
  }

  const url = request.nextUrl.clone();

  if (host.endsWith(`.${plataforma}`)) {
    const slug = host.slice(0, -(plataforma.length + 1));
    url.pathname = `/loja/${slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Domínio próprio: encaminha para a rota Node que resolve host → slug.
  url.pathname = `/loja/dominio-proprio/${host}${pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const rewrite = resolverTenantPorHost(request);
  if (rewrite) return rewrite;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
