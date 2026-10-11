// Slugs que colidem com rotas internas ou subdomínios da plataforma
// ({slug}.PLATAFORMA e /loja/{slug}) — nenhuma loja pode usá-los.
export const SLUGS_RESERVADOS = [
  "dominio-proprio",
  "www",
  "admin",
  "api",
  "app",
  "painel",
  "login",
  "cadastro",
  "convite",
  "loja",
  "dev",
  "mail",
  "suporte",
  "static",
] as const;

export function slugReservado(slug: string) {
  return (SLUGS_RESERVADOS as readonly string[]).includes(slug.toLowerCase());
}

export const MENSAGEM_SLUG_RESERVADO = "Este endereço de loja é reservado. Escolha outro.";
