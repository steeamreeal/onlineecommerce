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

  // Chamadas de API (tRPC do client, webhooks etc.) nunca são "navegação de
  // página de loja" — precisam ir direto para a mesma instância Next, sem
  // reescrita de tenant. Sem esse corte, uma request a /api/trpc/... vinda
  // de um domínio próprio virava /loja/dominio-proprio/{host}/api/trpc/...
  // (ou, após o redirect da página resolvedora, /loja/{slug}/api/trpc/...),
  // uma rota que não existe — toda chamada tRPC feita pelo browser no site
  // público de um domínio próprio quebrava com 404, mesmo a loja existindo.
  if (pathname.startsWith("/api/")) {
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

// Showcase interno de componentes (M1) — nunca deve ficar acessível em
// produção, mas o código continua útil em dev para revisar o design system.
function bloqueadaEmProducao(pathname: string) {
  return process.env.NODE_ENV === "production" && pathname.startsWith("/dev/ui");
}

export async function proxy(request: NextRequest) {
  if (bloqueadaEmProducao(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const rewrite = resolverTenantPorHost(request);
  if (rewrite) return rewrite;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
