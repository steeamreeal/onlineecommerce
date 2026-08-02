import { NextResponse } from "next/server";
import { getMpOAuth } from "@/lib/mercadopago";
import { verificarState } from "@/lib/mercadopago-state";
import { prisma } from "@/server/db/client";

function baseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Callback do Mercado Pago Connect: o lojista autorizou a plataforma no
// Mercado Pago e volta aqui com um `code` de uso único, que trocamos pelos
// tokens da conta dele (Loja.mpAccessToken) — nunca um token global.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const painel = `${baseUrl()}/painel/assinatura`;

  if (!code || !state) {
    return NextResponse.redirect(`${painel}?mp=erro`);
  }

  const lojaId = verificarState(state);
  if (!lojaId) {
    return NextResponse.redirect(`${painel}?mp=erro`);
  }

  const resultado = await getMpOAuth().create({
    body: {
      client_id: process.env.MERCADOPAGO_CLIENT_ID!,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET!,
      code,
      redirect_uri: `${baseUrl()}/api/mercadopago/callback`,
    },
  });

  if (!resultado.access_token || !resultado.user_id) {
    return NextResponse.redirect(`${painel}?mp=erro`);
  }

  await prisma.loja.update({
    where: { id: lojaId },
    data: {
      mpAccessToken: resultado.access_token,
      mpRefreshToken: resultado.refresh_token,
      mpUserId: String(resultado.user_id),
      mpConectadoEm: new Date(),
    },
  });

  return NextResponse.redirect(`${painel}?mp=sucesso`);
}
