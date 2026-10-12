import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/server/db/client";
import type { PapelUsuario } from "@prisma/client";
import { escolherVinculo, lerLojaAtivaDoCookie } from "@/lib/loja-ativa";

type UsuarioContexto = {
  id: string;
  email: string;
  papelAdmin: "SUPER_ADMIN" | "SUPORTE" | "FINANCEIRO" | null;
} | null;

export async function createContext({ req, resHeaders }: FetchCreateContextFnOptions) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie") ?? "";
          return cookieHeader
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const partes = [`${name}=${value}`, `Path=${options?.path ?? "/"}`, "HttpOnly", "SameSite=Lax"];
            if (options?.maxAge) partes.push(`Max-Age=${options.maxAge}`);
            if (options?.expires) partes.push(`Expires=${new Date(options.expires).toUTCString()}`);
            if (process.env.NODE_ENV === "production") partes.push("Secure");
            resHeaders.append("Set-Cookie", partes.join("; "));
          });
        },
      },
    },
  );

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  let usuario: UsuarioContexto = null;
  let lojaId: string | null = null;
  let papel: PapelUsuario | null = null;
  // Concedido pelo Dono (ver aprovacoes.ts, tipo ACESSO_EDITAR_TEMA) —
  // Administrador/Gerente só editam o tema/aparência do site depois de
  // pedir e o Dono aprovar; sem isso, mesmo esses papéis ficam de fora
  // (server/trpc/trpc.ts:temaProcedure).
  let podeEditarTema = false;

  if (supabaseUser) {
    const usuarioDb = await prisma.usuario.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: { lojas: { orderBy: { createdAt: "asc" }, take: 50 } },
    });

    if (usuarioDb) {
      usuario = { id: usuarioDb.id, email: usuarioDb.email, papelAdmin: usuarioDb.papelAdmin };
      // Loja ativa = a do cookie, MAS só se o usuário tiver vínculo com ela;
      // senão cai na primeira dele. O cookie nunca concede acesso por si só.
      const ativa = escolherVinculo(
        usuarioDb.lojas,
        lerLojaAtivaDoCookie(req.headers.get("cookie")),
      );
      lojaId = ativa?.lojaId ?? null;
      papel = ativa?.papel ?? null;
      podeEditarTema = ativa?.podeEditarTema ?? false;
    }
  }

  // IP de origem (Vercel preenche x-forwarded-for) — usado só para limitar
  // abuso de endpoints públicos (checkout), nunca para autorização.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  return {
    prisma,
    ip,
    resHeaders,
    usuario,
    lojaId,
    papel,
    podeEditarTema,
    // Sessão crua do Supabase, disponível mesmo antes do Usuario existir no
    // Prisma (ex.: logo após o signUp, antes de sincronizarUsuario rodar).
    supabaseUser: supabaseUser
      ? {
          id: supabaseUser.id,
          email: supabaseUser.email ?? null,
          emailConfirmado: Boolean(supabaseUser.email_confirmed_at),
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
