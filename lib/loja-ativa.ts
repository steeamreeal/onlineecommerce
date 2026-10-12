// Um mesmo usuário pode participar de várias lojas (UsuarioLoja). A loja
// "ativa" do painel é guardada num cookie — mas o cookie é só uma PREFERÊNCIA:
// o servidor sempre escolhe entre os vínculos que o próprio usuário tem
// (escolherVinculo), então um valor adulterado nunca dá acesso a outra loja.
export const COOKIE_LOJA_ATIVA = "loja_ativa";

// Teto de lojas por conta: a segunda loja já vem incluída; para ter mais, o
// lojista contrata (fale com o suporte). Também evita criação em massa de
// tenants (domínio, slug e dados) a partir de um único cadastro.
export const MAX_LOJAS_POR_USUARIO = 2;

export function lerLojaAtivaDoCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const parte of cookieHeader.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome === COOKIE_LOJA_ATIVA) {
      const valor = resto.join("=").trim();
      return valor.length > 0 && valor.length <= 64 ? decodeURIComponent(valor) : null;
    }
  }
  return null;
}

export function escolherVinculo<T extends { lojaId: string }>(
  vinculos: T[],
  lojaAtivaId: string | null,
): T | null {
  if (vinculos.length === 0) return null;
  return vinculos.find((v) => v.lojaId === lojaAtivaId) ?? vinculos[0];
}

export function cookieLojaAtiva(lojaId: string, producao: boolean) {
  const partes = [
    `${COOKIE_LOJA_ATIVA}=${encodeURIComponent(lojaId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 365}`,
  ];
  if (producao) partes.push("Secure");
  return partes.join("; ");
}

// Quem é só MEMBRO de equipe (convidado como Administrador, Gerente, Vendedor,
// Estoquista ou Separador) não abre loja própria pela conta que recebeu o
// convite — só vê a loja para a qual foi convidado. Pode abrir loja quem ainda
// não tem nenhum vínculo (conta nova) ou quem já é DONO de alguma, até o teto.
export function podeCriarLoja(papeis: string[]): boolean {
  if (papeis.length === 0) return true;
  const comoDono = papeis.filter((p) => p === "DONO").length;
  return comoDono > 0 && comoDono < MAX_LOJAS_POR_USUARIO;
}

export function ehSomenteMembroDeEquipe(papeis: string[]): boolean {
  return papeis.length > 0 && !papeis.includes("DONO");
}
