import { beforeEach, describe, expect, it, vi } from "vitest";

const expirar = vi.hoisted(() => vi.fn().mockResolvedValue({ analisados: 0, expirados: 0 }));
vi.mock("@/lib/pedidos-expiracao", () => ({ expirarPedidosNaoPagos: expirar }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { GET } from "../expirar-pedidos/route";

function req(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("https://example.com/api/cron/expirar-pedidos", { headers });
}

describe("GET /api/cron/expirar-pedidos", () => {
  beforeEach(() => {
    expirar.mockClear();
    process.env.CRON_SECRET = "segredo-cron";
  });

  it("recusa sem o header de autorização", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(expirar).not.toHaveBeenCalled();
  });

  it("recusa segredo errado", async () => {
    expect((await GET(req("Bearer outro"))).status).toBe(401);
  });

  it("recusa tudo quando CRON_SECRET não está configurado", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
  });

  it("executa com o segredo correto", async () => {
    const res = await GET(req("Bearer segredo-cron"));
    expect(res.status).toBe(200);
    expect(expirar).toHaveBeenCalledTimes(1);
  });
});
