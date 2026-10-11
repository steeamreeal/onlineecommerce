import { createHmac, timingSafeEqual } from "crypto";

// Assina o lojaId (e um instante de emissão) no parâmetro `state` do OAuth
// do Mercado Pago Connect, para o callback saber qual loja está conectando.
// HMAC com MERCADOPAGO_CLIENT_SECRET em vez de JWT para não trazer
// dependência nova só para isso. O `state` expira em 15 minutos: antes ele
// era fixo e valia para sempre, então um state vazado (log, histórico,
// Referer) permitia ligar outra conta Mercado Pago à loja a qualquer tempo.
const VALIDADE_STATE_MS = 15 * 60 * 1000;

function assinar(payload: string) {
  return createHmac("sha256", process.env.MERCADOPAGO_CLIENT_SECRET!).update(payload).digest("hex");
}

export function assinarState(lojaId: string, agora: number = Date.now()) {
  const payload = `${lojaId}.${agora}`;
  return `${payload}.${assinar(payload)}`;
}

export function verificarState(state: string, agora: number = Date.now()): string | null {
  const partes = state.split(".");
  if (partes.length !== 3) return null;
  const [lojaId, emitidoEm, assinatura] = partes;
  if (!lojaId || !emitidoEm || !assinatura) return null;

  const bufA = Buffer.from(assinatura);
  const bufB = Buffer.from(assinar(`${lojaId}.${emitidoEm}`));
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return null;
  }

  const emitido = Number(emitidoEm);
  if (!Number.isFinite(emitido) || agora - emitido > VALIDADE_STATE_MS || emitido > agora + 60_000) {
    return null;
  }
  return lojaId;
}
