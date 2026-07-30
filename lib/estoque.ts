/**
 * Regras de exibição de estoque compartilhadas entre os componentes do
 * painel (lista de produtos e abas de estoque), para evitar que o limite de
 * "estoque baixo" e o formato do rótulo de variação divirjam entre telas.
 */

export const ESTOQUE_BAIXO_LIMITE = 5;

export function variacaoLabel(v: {
  cor: string | null;
  tamanho: string | null;
  modelo: string | null;
}) {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}
