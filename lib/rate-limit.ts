// Limitador de taxa em memória, janela deslizante, por chave.
//
// Melhor esforço: em ambiente serverless cada instância tem a própria
// memória, então o limite real é "por instância" — freia rajadas e scripts
// ingênuos, mas não substitui um limitador distribuído (ex.: Upstash/Vercel
// KV) se o abuso for deliberado e distribuído. As travas duráveis ficam no
// banco (ver checkout.criarPedido: pedidos recentes por cliente).
const ocorrencias = new Map<string, number[]>();
const LIMITE_CHAVES = 10_000;

export function excedeuLimite(
  chave: string,
  { max, janelaMs }: { max: number; janelaMs: number },
  agora: number = Date.now(),
): boolean {
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

export function limparLimitador() {
  ocorrencias.clear();
}
