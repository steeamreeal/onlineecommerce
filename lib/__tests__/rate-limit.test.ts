import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { excedeuLimite, limiteExcedido, limparLimitador } from "../rate-limit";

describe("excedeuLimite", () => {
  beforeEach(() => limparLimitador());

  it("permite até o máximo e bloqueia a partir daí", () => {
    const cfg = { max: 3, janelaMs: 1000 };
    expect([1, 2, 3].map(() => excedeuLimite("ip", cfg, 0))).toEqual([false, false, false]);
    expect(excedeuLimite("ip", cfg, 10)).toBe(true);
  });

  it("libera de novo depois que a janela passa", () => {
    const cfg = { max: 1, janelaMs: 1000 };
    expect(excedeuLimite("ip", cfg, 0)).toBe(false);
    expect(excedeuLimite("ip", cfg, 500)).toBe(true);
    expect(excedeuLimite("ip", cfg, 1500)).toBe(false);
  });

  it("chaves diferentes não se afetam", () => {
    const cfg = { max: 1, janelaMs: 1000 };
    expect(excedeuLimite("a", cfg, 0)).toBe(false);
    expect(excedeuLimite("b", cfg, 0)).toBe(false);
  });
});

describe("limiteExcedido (Upstash opcional)", () => {
  const original = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };

  beforeEach(() => {
    limparLimitador();
    vi.restoreAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (original.url) process.env.UPSTASH_REDIS_REST_URL = original.url;
    if (original.token) process.env.UPSTASH_REDIS_REST_TOKEN = original.token;
  });

  function configurarRedis() {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-teste";
  }

  it("sem Upstash configurado usa a memória e não faz chamada de rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const cfg = { max: 1, janelaMs: 60_000 };
    expect(await limiteExcedido("k", cfg)).toBe(false);
    expect(await limiteExcedido("k", cfg)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("com Upstash: INCR acima do máximo bloqueia", async () => {
    configurarRedis();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([{ result: 11 }, { result: 1 }]), { status: 200 }));

    expect(await limiteExcedido("checkout:1.2.3.4", { max: 10, janelaMs: 600_000 })).toBe(true);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://redis.example.com/pipeline");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer token-teste" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual([
      ["INCR", "rl:checkout:1.2.3.4"],
      ["PEXPIRE", "rl:checkout:1.2.3.4", "600000", "NX"],
    ]);
  });

  it("com Upstash: contagem dentro do limite libera", async () => {
    configurarRedis();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ result: 3 }, { result: 0 }]), { status: 200 }),
    );
    expect(await limiteExcedido("k", { max: 10, janelaMs: 1000 })).toBe(false);
  });

  it("se o Redis falhar, cai para memória em vez de derrubar o checkout", async () => {
    configurarRedis();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede"));
    const cfg = { max: 1, janelaMs: 60_000 };
    expect(await limiteExcedido("k", cfg)).toBe(false);
    expect(await limiteExcedido("k", cfg)).toBe(true);
  });
});
