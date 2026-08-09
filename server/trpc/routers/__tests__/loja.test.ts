import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { lojaRouter } from "../loja";

const LOJA_ID = "loja-1";
const OUTRA_LOJA_ID = "loja-2";

function criarPrismaMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    loja: {
      findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ template: "EDITORIAL", corPrimaria: "#c2703d" }),
    },
    ...overrides,
  };
  return mock as unknown as PrismaClient;
}

function criarCaller(
  client: PrismaClient,
  papel: "DONO" | "ADMINISTRADOR" | "GERENTE" | "VENDEDOR" | null = "DONO",
  podeEditarTema = false,
) {
  const ctx = {
    prisma: client,
    usuario: { id: "u1" },
    lojaId: LOJA_ID,
    papel,
    podeEditarTema,
    supabaseUser: null,
  } as never;
  return lojaRouter.createCaller(ctx);
}

describe("lojaRouter.atualizarPersonalizacao", () => {
  it("atualiza template e corPrimaria escopado pela lojaId do contexto (nunca aceita lojaId no input)", async () => {
    const update = vi.fn().mockResolvedValue({ template: "EDITORIAL", corPrimaria: "#c2703d" });
    const client = criarPrismaMock({
      loja: {
        findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }),
        findFirst: vi.fn(),
        update,
      },
    });
    const caller = criarCaller(client);

    await caller.atualizarPersonalizacao({ template: "EDITORIAL", corPrimaria: "#c2703d" });

    expect(update).toHaveBeenCalledWith({
      where: { id: LOJA_ID },
      data: { template: "EDITORIAL", corPrimaria: "#c2703d" },
      select: { template: true, corPrimaria: true },
    });
  });

  it("nunca atualiza a loja de outro tenant: where.id é sempre a lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({ template: "VITRINE", corPrimaria: "#000000" });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarPersonalizacao({ template: "VITRINE", corPrimaria: "#000000" });

    const chamada = update.mock.calls[0][0];
    expect(chamada.where.id).toBe(LOJA_ID);
    expect(chamada.where.id).not.toBe(OUTRA_LOJA_ID);
  });

  it("rejeita template fora do enum válido", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarPersonalizacao({
        // @ts-expect-error valor inválido de propósito para testar a validação
        template: "NAO_EXISTE",
        corPrimaria: "#c2703d",
      }),
    ).rejects.toThrow();
  });

  it("rejeita corPrimaria fora do formato hex", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "laranja" }),
    ).rejects.toThrow();
  });

  it("rejeita usuário sem papel ADMINISTRADOR (roleProcedure)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita ADMINISTRADOR sem podeEditarTema (só Dono edita o tema por padrão)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "ADMINISTRADOR", false);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("aceita ADMINISTRADOR com podeEditarTema concedido pelo Dono", async () => {
    const update = vi.fn().mockResolvedValue({ template: "MINIMALISTA", corPrimaria: "#c2703d" });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client, "ADMINISTRADOR", true);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).resolves.not.toThrow();
  });

  it("aceita GERENTE com podeEditarTema concedido pelo Dono", async () => {
    const update = vi.fn().mockResolvedValue({ template: "MINIMALISTA", corPrimaria: "#c2703d" });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client, "GERENTE", true);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).resolves.not.toThrow();
  });

  it("rejeita GERENTE sem podeEditarTema", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "GERENTE", false);

    await expect(
      caller.atualizarPersonalizacao({ template: "MINIMALISTA", corPrimaria: "#c2703d" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("lojaRouter.atualizarIdentidade", () => {
  const identidade = {
    corPrimaria: "#c2703d",
    logoUrl: "https://exemplo.com/logo.png",
    whatsapp: "(11) 91234-5678",
    instagram: "@minhaloja",
    facebook: "",
    endereco: "Rua das Flores, 120",
    horarioAtend: "Seg. a sex., 9h às 18h",
    politicas: "Trocas em até 7 dias.",
  };

  it("atualiza os campos de identidade/contato escopados pela lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarIdentidade(identidade);

    expect(update).toHaveBeenCalledWith({
      where: { id: LOJA_ID },
      data: {
        corPrimaria: "#c2703d",
        logoUrl: "https://exemplo.com/logo.png",
        whatsapp: "(11) 91234-5678",
        instagram: "@minhaloja",
        facebook: null,
        endereco: "Rua das Flores, 120",
        horarioAtend: "Seg. a sex., 9h às 18h",
        politicas: "Trocas em até 7 dias.",
      },
      select: {
        corPrimaria: true,
        logoUrl: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        endereco: true,
        horarioAtend: true,
        politicas: true,
      },
    });
  });

  it("aceita logoUrl nulo para remover a logo", async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarIdentidade({ ...identidade, logoUrl: null });

    expect(update.mock.calls[0][0].data.logoUrl).toBeNull();
  });

  it("nunca atualiza a loja de outro tenant: where.id é sempre a lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarIdentidade(identidade);

    const chamada = update.mock.calls[0][0];
    expect(chamada.where.id).toBe(LOJA_ID);
    expect(chamada.where.id).not.toBe(OUTRA_LOJA_ID);
  });

  it("rejeita corPrimaria fora do formato hex", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarIdentidade({ ...identidade, corPrimaria: "laranja" }),
    ).rejects.toThrow();
  });

  it("rejeita usuário sem papel ADMINISTRADOR (roleProcedure)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    await expect(caller.atualizarIdentidade(identidade)).rejects.toThrow(TRPCError);
  });

  it("ADMINISTRADOR sem podeEditarTema ainda pode editar identidade/contato — só a aparência do site (temaProcedure) exige acesso concedido", async () => {
    const update = vi.fn().mockResolvedValue({});
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client, "ADMINISTRADOR", false);

    await expect(caller.atualizarIdentidade(identidade)).resolves.not.toThrow();
  });
});

describe("lojaRouter.atualizarBanners", () => {
  const banner = { url: "https://exemplo.com/banner.jpg", titulo: "Coleção Verão" };

  it("atualiza o array de banners escopado pela lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({ banners: [banner] });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarBanners({ banners: [banner] });

    expect(update).toHaveBeenCalledWith({
      where: { id: LOJA_ID },
      data: { banners: [{ ...banner, tipo: "IMAGEM" }] },
      select: { banners: true },
    });
  });

  it("nunca atualiza a loja de outro tenant: where.id é sempre a lojaId do contexto", async () => {
    const update = vi.fn().mockResolvedValue({ banners: [banner] });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await caller.atualizarBanners({ banners: [banner] });

    const chamada = update.mock.calls[0][0];
    expect(chamada.where.id).toBe(LOJA_ID);
    expect(chamada.where.id).not.toBe(OUTRA_LOJA_ID);
  });

  it("rejeita mais de 3 banners", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarBanners({ banners: [banner, banner, banner, banner] }),
    ).rejects.toThrow();
  });

  it("aceita banner sem título (título é opcional)", async () => {
    const update = vi.fn().mockResolvedValue({ banners: [{ url: banner.url, titulo: "" }] });
    const client = criarPrismaMock({
      loja: { findUnique: vi.fn().mockResolvedValue({ statusPlano: "ATIVO" }), findFirst: vi.fn(), update },
    });
    const caller = criarCaller(client);

    await expect(
      caller.atualizarBanners({ banners: [{ url: banner.url, titulo: "" }] }),
    ).resolves.not.toThrow();
  });

  it("rejeita banner sem url", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client);

    await expect(
      caller.atualizarBanners({ banners: [{ url: "", titulo: banner.titulo }] }),
    ).rejects.toThrow();
  });

  it("rejeita usuário sem papel ADMINISTRADOR (roleProcedure)", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "VENDEDOR");

    await expect(caller.atualizarBanners({ banners: [banner] })).rejects.toThrow(TRPCError);
  });

  it("rejeita ADMINISTRADOR sem podeEditarTema", async () => {
    const client = criarPrismaMock();
    const caller = criarCaller(client, "ADMINISTRADOR", false);

    await expect(caller.atualizarBanners({ banners: [banner] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
