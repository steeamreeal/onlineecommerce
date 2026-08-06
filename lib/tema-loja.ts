import { z } from "zod";

// Shape do JSON guardado em Loja.temaConfig — mesma lógica de Loja.banners
// (Json puro, sem tabela relacionada, sobrescrito por inteiro a cada save),
// só que descrevendo a página inicial inteira como uma lista ordenada de
// seções em vez de um único array homogêneo.

// Faixa de altura real (px) que o slider 0-100 de tamanho da logo cobre.
export const ALTURA_LOGO_MIN_PX = 16;
export const ALTURA_LOGO_MAX_PX = 80;

export function alturaLogoEmPx(tamanho: number | undefined): number {
  const t = tamanho ?? 40;
  return ALTURA_LOGO_MIN_PX + (t / 100) * (ALTURA_LOGO_MAX_PX - ALTURA_LOGO_MIN_PX);
}

export const alinhamentoTextoSchema = z.enum(["ESQUERDA", "CENTRO", "DIREITA"]);
export type AlinhamentoTexto = z.infer<typeof alinhamentoTextoSchema>;

export const posicaoVerticalSchema = z.enum(["INICIO", "CENTRO", "FIM"]);
export type PosicaoVertical = z.infer<typeof posicaoVerticalSchema>;

export const exibirEmSchema = z.enum(["AMBOS", "DESKTOP", "MOBILE"]);
export type ExibirEm = z.infer<typeof exibirEmSchema>;

export const bannerTemaSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  titulo: z.string(),
  tipo: z.enum(["IMAGEM", "VIDEO"]).default("IMAGEM"),
  urlMobile: z.string().optional(),
  tipoMobile: z.enum(["IMAGEM", "VIDEO"]).optional(),
  // Link/seção de destino ao clicar nessa imagem específica — independente
  // do linkBotao, que é só o CTA do texto sobreposto desse mesmo banner.
  link: z.string().trim().max(300).optional(),
  // Texto/botão sobreposto são por banner (cada slide do carrossel tem o
  // seu) — `titulo` acima é o texto principal; os campos abaixo controlam
  // o CTA e o posicionamento desse conteúdo dentro do slide.
  textoBotao: z.string().trim().max(40).optional(),
  linkBotao: z.string().trim().max(300).optional(),
  alinhamentoHorizontal: alinhamentoTextoSchema.optional(),
  alinhamentoVertical: posicaoVerticalSchema.optional(),
});

export type BannerTema = z.infer<typeof bannerTemaSchema>;

const secaoBaseSchema = z.object({
  id: z.string(),
  visivel: z.boolean().default(true),
});

export const secaoBarraAnuncioSchema = secaoBaseSchema.extend({
  tipo: z.literal("BARRA_ANUNCIO"),
  config: z.object({
    texto: z.string().trim().max(200),
    corFundo: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corTexto: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    alinhamento: alinhamentoTextoSchema.default("CENTRO"),
  }),
});

export const secaoCabecalhoSchema = secaoBaseSchema.extend({
  tipo: z.literal("CABECALHO"),
  config: z.object({
    mostrarBusca: z.boolean().default(true),
    mostrarConta: z.boolean().default(true),
    posicaoLogo: z.enum(["ESQUERDA", "CENTRO"]).default("ESQUERDA"),
    // Se "LOGO" mas a loja não tem Loja.logoUrl cadastrada, o renderer cai
    // para o nome — nunca deixa o cabeçalho sem identidade nenhuma.
    exibicaoLogo: z.enum(["LOGO", "NOME"]).default("NOME"),
    // Escala 0-100 mapeada linearmente para altura em px (ver
    // ALTURA_LOGO_MIN_PX/ALTURA_LOGO_MAX_PX) — só tem efeito quando
    // exibicaoLogo é "LOGO".
    tamanhoLogo: z.number().min(0).max(100).default(40),
  }),
});

export const secaoHeroSchema = secaoBaseSchema.extend({
  tipo: z.literal("HERO"),
  config: z.object({
    // Título, botão, link e posicionamento do texto vivem em cada item de
    // `banners` (ver bannerTemaSchema) — cada slide do carrossel tem o seu
    // próprio conteúdo sobreposto, não um texto único pra seção inteira.
    banners: z.array(bannerTemaSchema).max(3, "No máximo 3 banners por seção."),
    // Quando true, remove o espaçamento entre o cabeçalho e o banner (fica
    // rente/colado) — só tem efeito visual no template Minimalista, os
    // outros templates já não têm esse espaçamento.
    coladoNoCabecalho: z.boolean().default(false),
  }),
});

export const secaoColecaoDestaqueSchema = secaoBaseSchema.extend({
  tipo: z.literal("COLECAO_DESTAQUE"),
  config: z.object({
    titulo: z.string().trim().max(80),
    categoriaId: z.string().optional(),
    // Quantos produtos mostrar — vazio/undefined mostra todos que passarem
    // no filtro (categoria, se houver). Aplica independente de categoriaId
    // estar definido ou não.
    quantidade: z.number().int().min(1).max(50).optional(),
    // Com categoriaId definido, o lojista pode escolher manualmente quais
    // produtos daquela categoria aparecem (e em que ordem) em vez do filtro
    // automático por categoria — lista de Produto.id. Ignorado se
    // categoriaId não estiver definido (nesse caso não há categoria fixa
    // para os produtos pertencerem).
    produtosSelecionados: z.array(z.string()).optional(),
    linkVerTudo: z.boolean().default(true),
    alinhamento: alinhamentoTextoSchema.default("ESQUERDA"),
  }),
});

export const tamanhoTextoSchema = z.enum(["PEQUENO", "MEDIO", "GRANDE"]);
export type TamanhoTexto = z.infer<typeof tamanhoTextoSchema>;

export const secaoMenuCategoriasSchema = secaoBaseSchema.extend({
  tipo: z.literal("MENU_CATEGORIAS"),
  config: z.object({
    cor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    tamanho: tamanhoTextoSchema.default("MEDIO"),
    alinhamento: alinhamentoTextoSchema.default("ESQUERDA"),
    // Controla em qual(is) largura(s) de tela esse menu aparece — útil
    // porque o cabeçalho (CABECALHO) já tem sua própria navegação de
    // categorias visível a partir de md, então em muitos temas esse menu
    // fica redundante em desktop e só faz sentido em mobile (ou vice-versa).
    exibirEm: exibirEmSchema.default("AMBOS"),
  }),
});

export const secaoTextoSchema = secaoBaseSchema.extend({
  tipo: z.literal("TEXTO"),
  config: z.object({
    titulo: z.string().trim().max(120).optional(),
    corpo: z.string().trim().max(2000),
    alinhamento: alinhamentoTextoSchema.default("ESQUERDA"),
  }),
});

export const linkRodapeSchema = z.object({
  id: z.string(),
  texto: z.string().trim().max(60),
  url: z.string().trim().max(300),
});

export const colunaRodapeSchema = z.object({
  id: z.string(),
  titulo: z.string().trim().max(60),
  links: z.array(linkRodapeSchema).max(8, "No máximo 8 links por coluna."),
});

export type LinkRodape = z.infer<typeof linkRodapeSchema>;
export type ColunaRodape = z.infer<typeof colunaRodapeSchema>;

export const secaoRodapeSchema = secaoBaseSchema.extend({
  tipo: z.literal("RODAPE"),
  config: z.object({
    mostrarRedesSociais: z.boolean().default(true),
    mostrarPoliticas: z.boolean().default(true),
    // Newsletter e ícones de pagamento são só exibição/captação de e-mail
    // visual — não há back-end de armazenamento de inscrições nem amarração
    // com o gateway de pagamento real da loja (Mercado Pago Connect) neste
    // escopo. Ver painel-propriedades.tsx para o aviso mostrado ao lojista.
    mostrarNewsletter: z.boolean().default(false),
    mostrarFormasPagamento: z.boolean().default(false),
    colunas: z.array(colunaRodapeSchema).max(4, "No máximo 4 colunas no rodapé.").default([]),
  }),
});

export const secaoTemaSchema = z.discriminatedUnion("tipo", [
  secaoBarraAnuncioSchema,
  secaoCabecalhoSchema,
  secaoHeroSchema,
  secaoMenuCategoriasSchema,
  secaoColecaoDestaqueSchema,
  secaoTextoSchema,
  secaoRodapeSchema,
]);

export type SecaoTema = z.infer<typeof secaoTemaSchema>;
export type TipoSecaoTema = SecaoTema["tipo"];

// Fonte carregada via next/font/google (ver components/store/theme-fonts.ts)
// — lista curada para manter o carregamento previsível, igual à paleta
// curada de CORES_PRIMARIAS_SUGERIDAS.
export const FONTES_TEMA = [
  "INTER",
  "POPPINS",
  "PLAYFAIR_DISPLAY",
  "MERRIWEATHER",
  "MONTSERRAT",
  "DM_SANS",
] as const;

export const estiloTemaSchema = z.object({
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
  corSecundaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  fonteTitulo: z.enum(FONTES_TEMA).default("INTER"),
  fonteCorpo: z.enum(FONTES_TEMA).default("INTER"),
});

export type EstiloTema = z.infer<typeof estiloTemaSchema>;

export const temaConfigSchema = z.object({
  secoes: z.array(secaoTemaSchema).max(20, "No máximo 20 seções na página."),
  estilo: estiloTemaSchema,
});

export type TemaConfig = z.infer<typeof temaConfigSchema>;

// Rótulos e seções "fixas" (sempre presentes, não removíveis pelo lojista —
// mesma trava visual do editor de tema da Shopify, onde Cabeçalho/Rodapé são
// grupos à parte na árvore, fora da lista reordenável de "Modelo").
export const TIPOS_SECAO_FIXA: TipoSecaoTema[] = ["BARRA_ANUNCIO", "CABECALHO", "RODAPE"];

export const NOMES_TIPO_SECAO: Record<TipoSecaoTema, string> = {
  BARRA_ANUNCIO: "Barra de anúncios",
  CABECALHO: "Cabeçalho",
  HERO: "Banner principal",
  MENU_CATEGORIAS: "Menu de categorias",
  COLECAO_DESTAQUE: "Coleção em destaque",
  TEXTO: "Texto",
  RODAPE: "Rodapé",
};

export const NOMES_TAMANHO_TEXTO: Record<TamanhoTexto, string> = {
  PEQUENO: "Pequeno",
  MEDIO: "Médio",
  GRANDE: "Grande",
};

export const NOMES_EXIBIR_EM: Record<ExibirEm, string> = {
  AMBOS: "Sempre",
  DESKTOP: "Só desktop",
  MOBILE: "Só mobile",
};

export const NOMES_FONTE: Record<(typeof FONTES_TEMA)[number], string> = {
  INTER: "Inter",
  POPPINS: "Poppins",
  PLAYFAIR_DISPLAY: "Playfair Display",
  MERRIWEATHER: "Merriweather",
  MONTSERRAT: "Montserrat",
  DM_SANS: "DM Sans",
};

function criarId(): string {
  return crypto.randomUUID();
}

/**
 * Layout inicial usado quando a loja ainda não tem temaConfig salvo — inclui
 * as seções fixas mais Hero e Coleção em destaque, já populando o Hero com
 * os banners antigos (Loja.banners) para não perder o que o lojista já tinha
 * configurado antes do editor de tema existir.
 */
export function criarTemaConfigPadrao(opcoes: {
  corPrimaria?: string | null;
  bannersAntigos?: BannerTema[];
}): TemaConfig {
  return {
    secoes: [
      { id: criarId(), tipo: "BARRA_ANUNCIO", visivel: false, config: { texto: "", alinhamento: "CENTRO" } },
      {
        id: criarId(),
        tipo: "CABECALHO",
        visivel: true,
        config: {
          mostrarBusca: true,
          mostrarConta: true,
          posicaoLogo: "ESQUERDA",
          exibicaoLogo: "NOME",
          tamanhoLogo: 40,
        },
      },
      {
        id: criarId(),
        tipo: "HERO",
        visivel: true,
        config: {
          banners: opcoes.bannersAntigos ?? [],
          coladoNoCabecalho: false,
        },
      },
      {
        id: criarId(),
        tipo: "MENU_CATEGORIAS",
        visivel: true,
        config: { tamanho: "MEDIO", alinhamento: "ESQUERDA" },
      },
      {
        id: criarId(),
        tipo: "COLECAO_DESTAQUE",
        visivel: true,
        config: { titulo: "Produtos", linkVerTudo: true, alinhamento: "ESQUERDA" },
      },
      {
        id: criarId(),
        tipo: "RODAPE",
        visivel: true,
        config: {
          mostrarRedesSociais: true,
          mostrarPoliticas: true,
          mostrarNewsletter: false,
          mostrarFormasPagamento: false,
          colunas: [],
        },
      },
    ],
    estilo: {
      corPrimaria: opcoes.corPrimaria ?? "#EA580C",
      fonteTitulo: "INTER",
      fonteCorpo: "INTER",
    },
  };
}
