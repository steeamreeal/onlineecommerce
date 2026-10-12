import { describe, expect, it } from "vitest";
import { cookieLojaAtiva, escolherVinculo, lerLojaAtivaDoCookie } from "../loja-ativa";

const vinculos = [
  { lojaId: "loja-a", papel: "DONO" },
  { lojaId: "loja-b", papel: "VENDEDOR" },
];

describe("lerLojaAtivaDoCookie", () => {
  it("extrai o valor entre vários cookies", () => {
    expect(lerLojaAtivaDoCookie("a=1; loja_ativa=loja-b; sb-x=zzz")).toBe("loja-b");
  });
  it("devolve null sem o cookie, vazio ou grande demais", () => {
    expect(lerLojaAtivaDoCookie(null)).toBeNull();
    expect(lerLojaAtivaDoCookie("a=1")).toBeNull();
    expect(lerLojaAtivaDoCookie("loja_ativa=")).toBeNull();
    expect(lerLojaAtivaDoCookie(`loja_ativa=${"x".repeat(100)}`)).toBeNull();
  });
});

describe("escolherVinculo", () => {
  it("usa a loja do cookie quando o usuário tem vínculo com ela", () => {
    expect(escolherVinculo(vinculos, "loja-b")?.lojaId).toBe("loja-b");
  });
  it("cookie de loja que NÃO é do usuário cai na primeira dele (nunca concede acesso)", () => {
    expect(escolherVinculo(vinculos, "loja-de-outra-pessoa")?.lojaId).toBe("loja-a");
  });
  it("sem cookie usa a primeira; sem vínculos devolve null", () => {
    expect(escolherVinculo(vinculos, null)?.lojaId).toBe("loja-a");
    expect(escolherVinculo([], "loja-a")).toBeNull();
  });
});

describe("cookieLojaAtiva", () => {
  it("é HttpOnly e SameSite=Lax; Secure só em produção", () => {
    expect(cookieLojaAtiva("loja-a", false)).toContain("HttpOnly");
    expect(cookieLojaAtiva("loja-a", false)).toContain("SameSite=Lax");
    expect(cookieLojaAtiva("loja-a", false)).not.toContain("Secure");
    expect(cookieLojaAtiva("loja-a", true)).toContain("Secure");
  });
});
