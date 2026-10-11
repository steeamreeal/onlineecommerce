import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { expirarPedidosNaoPagos } from "@/lib/pedidos-expiracao";

function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const enviado = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Chamado pelo Vercel Cron (vercel.json). A Vercel envia
// `Authorization: Bearer $CRON_SECRET` quando a variável existe no projeto;
// sem ela configurada a rota recusa tudo (nunca fica aberta).
export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await expirarPedidosNaoPagos(prisma);
  return NextResponse.json(resultado);
}
