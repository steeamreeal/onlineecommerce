export type Banner = {
  id: string;
  url: string;
  titulo?: string;
};

export type ConfiguracaoLoja = {
  nome: string;
  slug: string;
  logoUrl?: string;
  corPrimaria: string;
  banners: Banner[];
  avisoTopo?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  endereco?: string;
  horarioAtend?: string;
  politicas?: string;
  dominioProprio?: string;
};

export const configuracaoLojaMock: ConfiguracaoLoja = {
  nome: "Minha Loja",
  slug: "minha-loja",
  corPrimaria: "#EA580C",
  banners: [
    { id: "ban-1", url: "/mocks/banner-verao.jpg", titulo: "Coleção Verão" },
    { id: "ban-2", url: "/mocks/banner-frete.jpg", titulo: "Frete grátis acima de R$150" },
  ],
  avisoTopo: "Frete grátis para compras acima de R$150",
  whatsapp: "(11) 91234-5678",
  instagram: "@minhaloja",
  endereco: "Rua das Flores, 120 - Jardim América, São Paulo/SP",
  horarioAtend: "Seg. a sex., 9h às 18h",
  politicas: "Trocas em até 7 dias após o recebimento, produto sem uso e com etiqueta.",
};

export function getConfiguracaoLojaPorSlug(slug: string): ConfiguracaoLoja | undefined {
  return configuracaoLojaMock.slug === slug ? configuracaoLojaMock : undefined;
}
