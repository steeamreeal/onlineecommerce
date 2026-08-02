import Stripe from "stripe";

let client: Stripe | undefined;

// Instanciado sob demanda (não no carregamento do módulo) para que o build
// do Next.js não falhe quando STRIPE_SECRET_KEY ainda não está configurada
// no ambiente (ex.: build local antes do setup de produção).
export function getStripe() {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return client;
}
