import { MercadoPagoConfig, OAuth, Payment, Preference } from "mercadopago";

// Client OAuth da PLATAFORMA — usado só para o fluxo de "Conectar Mercado
// Pago" (gerar URL de autorização, trocar code por tokens). O MercadoPagoConfig
// exige um accessToken no construtor, mas os métodos de OAuth (create,
// refresh, getAuthorizationURL) autenticam via client_id/client_secret no
// corpo da requisição, não pelo accessToken — por isso o placeholder abaixo.
let oauthConfig: MercadoPagoConfig | undefined;
function getOAuthConfig() {
  if (!oauthConfig) {
    oauthConfig = new MercadoPagoConfig({ accessToken: "platform-oauth-client" });
  }
  return oauthConfig;
}

export function getMpOAuth() {
  return new OAuth(getOAuthConfig());
}

// Clients autenticados com o mpAccessToken de UMA loja específica (Mercado
// Pago Connect) — o dinheiro do checkout cai direto na conta do lojista.
// Nunca usar um token global aqui; cada chamada recebe o token da loja dona
// do pedido.
export function getMpPreference(accessToken: string) {
  return new Preference(new MercadoPagoConfig({ accessToken }));
}

export function getMpPayment(accessToken: string) {
  return new Payment(new MercadoPagoConfig({ accessToken }));
}
