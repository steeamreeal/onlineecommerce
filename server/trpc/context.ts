import { prisma } from "@/server/db/client";

type UsuarioContexto = {
  id: string;
  email: string;
} | null;

export async function createContext() {
  // TODO: trocar pela sessão real do Supabase Auth (cookies da requisição)
  // e resolver a loja ativa (multi-tenant) a partir do subdomínio/slug ou do usuário logado.
  const usuario: UsuarioContexto = null;
  const lojaId: string | null = null;

  return {
    prisma,
    usuario,
    lojaId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
