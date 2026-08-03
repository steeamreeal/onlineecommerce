// URL base da plataforma para redirects/callbacks server-side (Stripe,
// Mercado Pago OAuth). Usa NEXT_PUBLIC_PLATFORM_DOMAIN — não VERCEL_URL,
// que muda a cada deployment/preview e quebraria a redirect_uri fixa
// registrada no app do Mercado Pago. VERCEL_URL só entra como fallback
// (previews sem domínio customizado).
export function baseUrl() {
  const plataforma = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN;
  if (plataforma) {
    const protocolo = plataforma.startsWith("localhost") ? "http" : "https";
    return `${protocolo}://${plataforma}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
