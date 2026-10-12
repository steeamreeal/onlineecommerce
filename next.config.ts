import type { NextConfig } from "next";

// Cabeçalhos de segurança básicos. A CSP está em modo REPORT-ONLY de
// propósito: o site público carrega imagens/vídeos do Supabase Storage e o
// checkout redireciona para o Mercado Pago, então uma CSP bloqueante sem
// observar produção quebraria vitrines. Violações são enviadas para
// /api/csp-report (logs da Vercel); quando ficarem limpas, trocar o nome do
// header para Content-Security-Policy.
// Nunca deve derrubar o build: valor ausente/malformado cai no curinga.
function origemSupabase() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}
const supabaseHost = origemSupabase();

const cspReportOnly = [
  "default-src 'self'",
  `img-src 'self' data: blob: https: ${supabaseHost}`,
  `media-src 'self' blob: ${supabaseHost}`,
  // Next.js injeta scripts/estilos inline (hidratação, Tailwind); sem nonces
  // 'unsafe-inline' é inevitável aqui.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supabaseHost} https://*.supabase.co wss://*.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join("; ");
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  // Não anuncia o framework/versão em cada resposta.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
