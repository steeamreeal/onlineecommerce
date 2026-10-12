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
  function setup(papeis: string[]) {
    const { resHeaders, append } = headersMock();
    const lojaCreate = vi.fn().mockResolvedValue({ id: "loja-nova", slug: "nova" });
    const usuarioLojaCreate = vi.fn().mockResolvedValue({});
    const prisma = {
      usuarioLoja: {
        findMany: vi.fn().mockResolvedValue(papeis.map((papel) => ({ papel }))),
        create: usuarioLojaCreate,
      },
      loja: { findUnique: vi.fn().mockResolvedValue(null), create: lojaCreate },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "loja-a", resHeaders } as never;
    return { caller: onboardingRouter.createCaller(ctx), append, usuarioLojaCreate };
  }

  it("permite abrir outra loja, vira DONO dela e a torna ativa", async () => {
    const { caller, append, usuarioLojaCreate } = setup(["DONO"]); // já tem 1, abre a 2ª
    await caller.criarLoja({ nome: "Minha segunda loja", slug: "segunda-loja" });

    expect(usuarioLojaCreate).toHaveBeenCalledWith({
      data: { usuarioId: "u1", lojaId: "loja-nova", papel: "DONO" },
    });
    expect(append).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("loja_ativa=loja-nova"));
  });

  it("recusa quando a conta já está no teto de lojas", async () => {
    const { caller, usuarioLojaCreate } = setup(["DONO", "DONO"]);
    await expect(caller.criarLoja({ nome: "Mais uma", slug: "mais-uma" })).rejects.toThrow("já tem 2 lojas");
    expect(usuarioLojaCreate).not.toHaveBeenCalled();
  });

  it.each(["VENDEDOR", "ESTOQUISTA", "SEPARADOR", "GERENTE", "ADMINISTRADOR"])(
    "membro de equipe (%s) não abre loja própria",
    async (papel) => {
      const { caller, usuarioLojaCreate } = setup([papel]);
      await expect(caller.criarLoja({ nome: "Minha loja", slug: "minha-loja" })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(usuarioLojaCreate).not.toHaveBeenCalled();
    },
  );

  it("conta nova, sem nenhum vínculo, pode abrir a primeira loja", async () => {
    const { caller, usuarioLojaCreate } = setup([]);
    await caller.criarLoja({ nome: "Primeira loja", slug: "primeira-loja" });
    expect(usuarioLojaCreate).toHaveBeenCalledTimes(1);
  });

  it("dono em uma loja que também é membro de outra ainda pode abrir a sua segunda", async () => {
    const { caller } = setup(["DONO", "VENDEDOR"]);
    await expect(caller.criarLoja({ nome: "Segunda", slug: "segunda" })).resolves.toBeDefined();
  });
});

describe("minhasLojas.listar: podeCriarLoja", () => {
  async function listar(papeis: string[]) {
    const prisma = {
      usuarioLoja: {
        findMany: vi.fn().mockResolvedValue(
          papeis.map((papel, i) => ({ papel, loja: { id: `l${i}`, nome: `Loja ${i}`, slug: `l${i}`, statusPlano: "ATIVO" } })),
        ),
      },
    };
    const ctx = { prisma, usuario: { id: "u1" }, lojaId: "l0" } as never;
    return (await minhasLojasRouter.createCaller(ctx).listar()).podeCriarLoja;
  }

  it("false para quem é só membro de equipe", async () => {
    expect(await listar(["VENDEDOR"])).toBe(false);
  });
  it("true para dono com 1 loja; false com 2 (teto)", async () => {
    expect(await listar(["DONO"])).toBe(true);
    expect(await listar(["DONO", "DONO"])).toBe(false);
  });
});
