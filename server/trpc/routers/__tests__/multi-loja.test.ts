import { describe, expect, it, vi } from "vitest";
import { minhasLojasRouter } from "../minhas-lojas";
import { onboardingRouter } from "../onboarding";

function headersMock() {
  const append = vi.fn();
  return { resHeaders: { append } as unknown as Headers, append };
}

describe("minhasLojas.selecionar", () => {
  it("troca a loja ativa quando o usuário tem vínculo (grava o cookie)", async () => {
    const { resHeaders, append } = headersMock();
    const prisma = { usuarioLoja: { findFirst: vi.fn().mockResolvedValue({ id: "v1" }) } };
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-a", resHeaders } as never;

    await minhasLojasRouter.createCaller(ctx).selecionar({ lojaId: "loja-b" });

    expect(prisma.usuarioLoja.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: "u1", lojaId: "loja-b" },
      select: { id: true },
    });
    expect(append).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("loja_ativa=loja-b"));
  });

  it("recusa loja em que o usuário não tem vínculo e não grava cookie", async () => {
    const { resHeaders, append } = headersMock();
    const prisma = { usuarioLoja: { findFirst: vi.fn().mockResolvedValue(null) } };
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-a", resHeaders } as never;

    await expect(minhasLojasRouter.createCaller(ctx).selecionar({ lojaId: "loja-alheia" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(append).not.toHaveBeenCalled();
  });

  it("exige login", async () => {
    const ctx = { prisma: {}, usuario: null, lojaId: null } as never;
    await expect(minhasLojasRouter.createCaller(ctx).selecionar({ lojaId: "x" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("onboarding.criarLoja com várias lojas", () => {
  function setup(lojasDoUsuario: number) {
    const { resHeaders, append } = headersMock();
    const lojaCreate = vi.fn().mockResolvedValue({ id: "loja-nova", slug: "nova" });
    const usuarioLojaCreate = vi.fn().mockResolvedValue({});
    const prisma = {
      usuarioLoja: { count: vi.fn().mockResolvedValue(lojasDoUsuario), create: usuarioLojaCreate },
      loja: { findUnique: vi.fn().mockResolvedValue(null), create: lojaCreate },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-a", resHeaders } as never;
    return { caller: onboardingRouter.createCaller(ctx), append, usuarioLojaCreate };
  }

  it("permite abrir outra loja, vira DONO dela e a torna ativa", async () => {
    const { caller, append, usuarioLojaCreate } = setup(1); // já tem 1, abre a 2ª
    await caller.criarLoja({ nome: "Minha segunda loja", slug: "segunda-loja" });

    expect(usuarioLojaCreate).toHaveBeenCalledWith({
      data: { usuarioId: "u1", lojaId: "loja-nova", papel: "DONO" },
    });
    expect(append).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("loja_ativa=loja-nova"));
  });

  it("recusa quando a conta já está no teto de lojas", async () => {
    const { caller, usuarioLojaCreate } = setup(2);
    await expect(caller.criarLoja({ nome: "Mais uma", slug: "mais-uma" })).rejects.toThrow("já tem 2 lojas");
    expect(usuarioLojaCreate).not.toHaveBeenCalled();
  });
});
