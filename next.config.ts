import type { NextConfig } from "next";

// Cabeçalhos de segurança básicos. CSP fica de fora de propósito: o site
// público carrega imagens/vídeos do Supabase Storage e o checkout redireciona
// para o Mercado Pago — uma CSP restritiva sem testar em produção quebraria
// vitrines. Vale adicioná-la depois, em modo report-only primeiro.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
