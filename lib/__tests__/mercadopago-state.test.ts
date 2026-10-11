import { beforeEach, describe, expect, it } from "vitest";
import { assinarState, verificarState } from "../mercadopago-state";

describe("state do OAuth do Mercado Pago", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_CLIENT_SECRET = "segredo-de-teste";
  });

  it("aceita um state recém-emitido e devolve o lojaId", () => {
    const agora = 1_700_000_000_000;
    expect(verificarState(assinarState("loja-1", agora), agora + 1000)).toBe("loja-1");
  });

  it("rejeita state expirado (mais de 15 minutos)", () => {
    const agora = 1_700_000_000_000;
    const state = assinarState("loja-1", agora);
    expect(verificarState(state, agora + 16 * 60 * 1000)).toBeNull();
  });

  it("rejeita state adulterado (troca de loja)", () => {
    const agora = 1_700_000_000_000;
    const [, ts, assinatura] = assinarState("loja-1", agora).split(".");
    expect(verificarState(`loja-2.${ts}.${assinatura}`, agora)).toBeNull();
  });

  it("rejeita o formato antigo (sem timestamp)", () => {
    expect(verificarState("loja-1.abc123", Date.now())).toBeNull();
  });
});
