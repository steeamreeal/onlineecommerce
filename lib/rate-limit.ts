// Limitador de taxa por chave, janela fixa.
//
// Dois modos:
// - Distribuído (Upstash Redis via REST), ativo quando UPSTASH_REDIS_REST_URL
//   e UPSTASH_REDIS_REST_TOKEN existem — vale para todas as instâncias
//   serverless.
// - Em memória (fallback): melhor esforço, "por instância" — freia rajadas e
//   scripts ingênuos, mas não abuso distribuído. As travas duráveis ficam no
//   banco (ver checkout.criarPedido: pedidos recentes por cliente).
//
// Em falha do Redis (rede, credencial) o limitador cai para memória em vez de
// derrubar o checkout.
type Config = { max: number; janelaMs: number };

const ocorrencias = new Map<string, number[]>();
const LIMITE_CHAVES = 10_000;

export function excedeuLimite(chave: string, { max, janelaMs }: Config, agora: number = Date.now()): boolean {
  const recentes = (ocorrencias.get(chave) ?? []).filter((t) => agora - t < janelaMs);

  if (recentes.length >= max) {
    ocorrencias.set(chave, recentes);
    return true;
  }

  recentes.push(agora);
  ocorrencias.set(chave, recentes);

  // Evita crescer sem limite sob varredura de IPs.
  if (ocorrencias.size > LIMITE_CHAVES) {
    for (const [k, v] of ocorrencias) {
      if (v.every((t) => agora - t >= janelaMs)) ocorrencias.delete(k);
    }
  }
  return false;
}

async function excedeuLimiteRedis(chave: string, { max, janelaMs }: Config): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // INCR cria a chave em 1 na primeira chamada; PEXPIRE ... NX só define o
    // prazo quando a chave ainda não tem — a janela começa na 1ª ocorrência.
    const resposta = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", chave],
        ["PEXPIRE", chave, String(janelaMs), "NX"],
      ]),
      signal: AbortSignal.timeout(1500),
    });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as { result?: unknown }[];
    const contagem = Number(dados?.[0]?.result);
    if (!Number.isFinite(contagem)) return null;
    return contagem > max;
  } catch {
    return null;
  }
}

export async function limiteExcedido(chave: string, config: Config): Promise<boolean> {
  const distribuido = await excedeuLimiteRedis(`rl:${chave}`, config);
  if (distribuido !== null) return distribuido;
  return excedeuLimite(chave, config);
}

export function limparLimitador() {
  ocorrencias.clear();
}
