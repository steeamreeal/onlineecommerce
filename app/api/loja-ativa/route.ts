import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/client";

const bodySchema = z.object({ lojaId: z.string() });

// Troca qual loja está "ativa" para o login atual (ver trocador de loja no
// painel, components/dashboard/trocador-loja.tsx, e server/trpc/context.ts
// que lê esse cookie). Um usuário pode ter acesso a mais de uma loja
// (UsuarioLoja) - por isso sempre revalidamos o vínculo aqui, nunca
// confiamos no lojaId enviado pelo client sem checar.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const vinculo = await prisma.usuarioLoja.findFirst({
    where: {
      lojaId: parsed.data.lojaId,
      usuario: { supabaseId: supabaseUser.id },
    },
  });

  if (!vinculo) {
    return NextResponse.json({ error: "Você não tem acesso a esta loja." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("loja_ativa", vinculo.lojaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
