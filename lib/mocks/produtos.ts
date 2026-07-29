export type StatusProduto = "ATIVO" | "INATIVO" | "DESTAQUE";

export type Categoria = {
  id: string;
  nome: string;
};

export type VariacaoProduto = {
  id: string;
  produtoId: string;
  cor?: string;
  tamanho?: string;
  modelo?: string;
  estoque: number;
};

export type FotoProduto = {
  id: string;
  url: string;
  ordem: number;
};

export type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  precoNormal: number;
  precoPromo?: number;
  pesoGramas?: number;
  alturaCm?: number;
  larguraCm?: number;
  profundidadeCm?: number;
  status: StatusProduto;
  categoriaId?: string;
  fotos: FotoProduto[];
  variacoes: VariacaoProduto[];
  createdAt: string;
};

export type MovimentoEstoque = {
  id: string;
  variacaoId: string;
  produtoNome: string;
  variacaoLabel: string;
  quantidade: number;
  tipo: "ENTRADA" | "SAIDA";
  motivo?: string;
  createdAt: string;
};

export const ESTOQUE_BAIXO_LIMITE = 5;

export const categoriasMock: Categoria[] = [
  { id: "cat-1", nome: "Camisetas" },
  { id: "cat-2", nome: "Calçados" },
  { id: "cat-3", nome: "Acessórios" },
  { id: "cat-4", nome: "Bolsas" },
];

export const produtosMock: Produto[] = [
  {
    id: "prod-1",
    nome: "Camiseta Básica Algodão",
    descricao: "Camiseta 100% algodão, corte reto, gola redonda.",
    codigo: "CAM-001",
    precoNormal: 79.9,
    precoPromo: 59.9,
    pesoGramas: 200,
    alturaCm: 2,
    larguraCm: 30,
    profundidadeCm: 25,
    status: "DESTAQUE",
    categoriaId: "cat-1",
    fotos: [{ id: "foto-1", url: "/mocks/camiseta.jpg", ordem: 0 }],
    variacoes: [
      { id: "var-1", produtoId: "prod-1", cor: "Preto", tamanho: "P", estoque: 12 },
      { id: "var-2", produtoId: "prod-1", cor: "Preto", tamanho: "M", estoque: 3 },
      { id: "var-3", produtoId: "prod-1", cor: "Branco", tamanho: "M", estoque: 0 },
    ],
    createdAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "prod-2",
    nome: "Tênis Runner Pro",
    descricao: "Tênis para corrida com amortecimento em gel.",
    codigo: "TEN-014",
    precoNormal: 349.9,
    pesoGramas: 800,
    status: "ATIVO",
    categoriaId: "cat-2",
    fotos: [{ id: "foto-2", url: "/mocks/tenis.jpg", ordem: 0 }],
    variacoes: [
      { id: "var-4", produtoId: "prod-2", cor: "Azul", tamanho: "40", estoque: 4 },
      { id: "var-5", produtoId: "prod-2", cor: "Azul", tamanho: "42", estoque: 8 },
    ],
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "prod-3",
    nome: "Boné Aba Curva",
    codigo: "BON-007",
    precoNormal: 59.9,
    status: "INATIVO",
    categoriaId: "cat-3",
    fotos: [],
    variacoes: [{ id: "var-6", produtoId: "prod-3", modelo: "Único", estoque: 20 }],
    createdAt: "2026-04-10T10:00:00.000Z",
  },
  {
    id: "prod-4",
    nome: "Bolsa Transversal Couro Sintético",
    descricao: "Bolsa transversal com alça ajustável.",
    codigo: "BOL-022",
    precoNormal: 129.9,
    precoPromo: 99.9,
    status: "ATIVO",
    categoriaId: "cat-4",
    fotos: [{ id: "foto-3", url: "/mocks/bolsa.jpg", ordem: 0 }],
    variacoes: [
      { id: "var-7", produtoId: "prod-4", cor: "Caramelo", estoque: 2 },
      { id: "var-8", produtoId: "prod-4", cor: "Preto", estoque: 15 },
    ],
    createdAt: "2026-07-02T10:00:00.000Z",
  },
];

export const movimentosEstoqueMock: MovimentoEstoque[] = [
  {
    id: "mov-1",
    variacaoId: "var-2",
    produtoNome: "Camiseta Básica Algodão",
    variacaoLabel: "Preto / M",
    quantidade: 20,
    tipo: "ENTRADA",
    motivo: "Compra de fornecedor",
    createdAt: "2026-07-20T14:30:00.000Z",
  },
  {
    id: "mov-2",
    variacaoId: "var-2",
    produtoNome: "Camiseta Básica Algodão",
    variacaoLabel: "Preto / M",
    quantidade: 17,
    tipo: "SAIDA",
    motivo: "Venda #1042",
    createdAt: "2026-07-24T09:15:00.000Z",
  },
  {
    id: "mov-3",
    variacaoId: "var-3",
    produtoNome: "Camiseta Básica Algodão",
    variacaoLabel: "Branco / M",
    quantidade: 10,
    tipo: "SAIDA",
    motivo: "Venda #1055",
    createdAt: "2026-07-26T16:45:00.000Z",
  },
  {
    id: "mov-4",
    variacaoId: "var-4",
    produtoNome: "Tênis Runner Pro",
    variacaoLabel: "Azul / 40",
    quantidade: 12,
    tipo: "ENTRADA",
    motivo: "Compra de fornecedor",
    createdAt: "2026-07-15T11:00:00.000Z",
  },
  {
    id: "mov-5",
    variacaoId: "var-4",
    produtoNome: "Tênis Runner Pro",
    variacaoLabel: "Azul / 40",
    quantidade: 8,
    tipo: "SAIDA",
    motivo: "Venda #1061",
    createdAt: "2026-07-27T13:20:00.000Z",
  },
  {
    id: "mov-6",
    variacaoId: "var-7",
    produtoNome: "Bolsa Transversal Couro Sintético",
    variacaoLabel: "Caramelo",
    quantidade: 5,
    tipo: "ENTRADA",
    motivo: "Ajuste de inventário",
    createdAt: "2026-07-10T10:00:00.000Z",
  },
];

export function variacaoLabel(v: VariacaoProduto): string {
  return [v.cor, v.tamanho, v.modelo].filter(Boolean).join(" / ") || "Padrão";
}

export function estoqueTotal(produto: Produto): number {
  return produto.variacoes.reduce((total, v) => total + v.estoque, 0);
}

export function categoriaNome(categoriaId?: string): string {
  return categoriasMock.find((c) => c.id === categoriaId)?.nome ?? "Sem categoria";
}
