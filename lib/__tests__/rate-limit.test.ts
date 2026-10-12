import { beforeEach, describe, expect, it } from "vitest";
import { excedeuLimite, limparLimitador } from "../rate-limit";

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
