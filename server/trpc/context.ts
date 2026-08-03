import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/server/db/client";

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

  if (supabaseUser) {
    const usuarioDb = await prisma.usuario.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: { lojas: { take: 1, orderBy: { createdAt: "asc" } } },
    });

    if (usuarioDb) {
      usuario = { id: usuarioDb.id, email: usuarioDb.email, papelAdmin: usuarioDb.papelAdmin };
      lojaId = usuarioDb.lojas[0]?.lojaId ?? null;
    }
  }

  return {
    prisma,
    usuario,
    lojaId,
    // Sessão crua do Supabase, disponível mesmo antes do Usuario existir no
    // Prisma (ex.: logo após o signUp, antes de sincronizarUsuario rodar).
    supabaseUser: supabaseUser
      ? { id: supabaseUser.id, email: supabaseUser.email ?? null }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
