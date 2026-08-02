import { createHmac, timingSafeEqual } from "crypto";

// Assina o lojaId no parâmetro `state` do OAuth do Mercado Pago Connect,
// para o callback confiar em qual loja está conectando sem depender de
// sessão (o navegador do lojista pode ter saído do domínio da plataforma
// durante o redirect). HMAC com MERCADOPAGO_CLIENT_SECRET em vez de JWT
// para não trazer dependência nova só para isso.
export function assinarState(lojaId: string) {
  const assinatura = createHmac("sha256", process.env.MERCADOPAGO_CLIENT_SECRET!)
    .update(lojaId)
    .digest("hex");
  return `${lojaId}.${assinatura}`;
}

export function verificarState(state: string): string | null {
  const [lojaId, assinatura] = state.split(".");
  if (!lojaId || !assinatura) return null;

  const esperada = createHmac("sha256", process.env.MERCADOPAGO_CLIENT_SECRET!)
    .update(lojaId)
    .digest("hex");

  const bufA = Buffer.from(assinatura);
  const bufB = Buffer.from(esperada);
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return null;
  }
  return lojaId;
}
