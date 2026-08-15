import { z } from "zod";

// Shape do JSON guardado em Loja.temaConfig — mesma lógica de Loja.banners
// (Json puro, sem tabela relacionada, sobrescrito por inteiro a cada save),
// só que descrevendo a página inicial inteira como uma lista ordenada de
// seções em vez de um único array homogêneo.

// Faixa de altura real (px) que o slider 0-100 de tamanho da logo cobre.
export const ALTURA_LOGO_MIN_PX = 16;
export const ALTURA_LOGO_MAX_PX = 220;

export function alturaLogoEmPx(tamanho: number | undefined): number {
  const t = tamanho ?? 65;
  return ALTURA_LOGO_MIN_PX + (t / 100) * (ALTURA_LOGO_MAX_PX - ALTURA_LOGO_MIN_PX);
}

export const alinhamentoTextoSchema = z.enum(["ESQUERDA", "CENTRO", "DIREITA"]);
export type AlinhamentoTexto = z.infer<typeof alinhamentoTextoSchema>;

export const posicaoVerticalSchema = z.enum(["INICIO", "CENTRO", "FIM"]);
export type PosicaoVertical = z.infer<typeof posicaoVerticalSchema>;

export const exibirEmSchema = z.enum(["AMBOS", "DESKTOP", "MOBILE"]);
export type ExibirEm = z.infer<typeof exibirEmSchema>;

// Fonte carregada via next/font/google (ver app/(public-store)/loja/[slug]/layout.tsx)
// — lista curada para manter o carregamento previsível, igual à paleta
// curada de CORES_PRIMARIAS_SUGERIDAS. Precisa vir antes de bannerTemaSchema
// porque é usada nos campos de fonte do título/botão do banner.
export const FONTES_TEMA = [
  "INTER",
  "POPPINS",
  "PLAYFAIR_DISPLAY",
  "MERRIWEATHER",
  "MONTSERRAT",
  "DM_SANS",
] as const;

export type FonteTema = (typeof FONTES_TEMA)[number];

export const NOMES_FONTE: Record<(typeof FONTES_TEMA)[number], string> = {
  INTER: "Inter",
  POPPINS: "Poppins",
  PLAYFAIR_DISPLAY: "Playfair Display",
  MERRIWEATHER: "Merriweather",
  MONTSERRAT: "Montserrat",
  DM_SANS: "DM Sans",
};

// CSS var gerada pelo next/font/google para cada fonte (ver layout da loja
// pública) — usada via style={{ fontFamily: FONTE_CSS_VAR[fonte] }} para
// aplicar uma fonte específica num elemento, independente da fonte padrão
// do tema.
export const FONTE_CSS_VAR: Record<(typeof FONTES_TEMA)[number], string> = {
  INTER: "var(--font-inter)",
  POPPINS: "var(--font-poppins)",
  PLAYFAIR_DISPLAY: "var(--font-playfair-display)",
  MERRIWEATHER: "var(--font-merriweather)",
  MONTSERRAT: "var(--font-montserrat)",
  DM_SANS: "var(--font-dm-sans)",
};

// Faixas 0-100 → px, mesmo princípio de alturaLogoEmPx: undefined preserva o
// visual padrão em Tailwind (classes já existentes), só aplica o inline
// style quando o lojista escolheu um valor explicitamente.
const TAMANHO_FONTE_MIN_PX = 12;
const TAMANHO_FONTE_MAX_PX = 48;

export function tamanhoFonteEmPx(tamanho: number | undefined): number | undefined {
  if (tamanho == null) return undefined;
  return TAMANHO_FONTE_MIN_PX + (tamanho / 100) * (TAMANHO_FONTE_MAX_PX - TAMANHO_FONTE_MIN_PX);
}

export function paddingBotaoEmPx(
  tamanho: number | undefined,
): { paddingInline: number; paddingBlock: number } | undefined {
  if (tamanho == null) return undefined;
  return {
    paddingInline: 12 + (tamanho / 100) * (32 - 12),
    paddingBlock: 6 + (tamanho / 100) * (18 - 6),
  };
}

export function arredondamentoBotaoEmPx(tamanho: number | undefined): number | undefined {
  if (tamanho == null) return undefined;
  return (tamanho / 100) * 24;
}

// Faixa de espaço vertical (px) que o slider 0-100 de espaçamento entre as
// linhas do cabeçalho cobre.
export const ESPACAMENTO_CABECALHO_MIN_PX = 0;
export const ESPACAMENTO_CABECALHO_MAX_PX = 32;

export function espacamentoCabecalhoEmPx(espacamento: number | undefined): number {
  const e = espacamento ?? 8;
  return (
    ESPACAMENTO_CABECALHO_MIN_PX +
    (e / 100) * (ESPACAMENTO_CABECALHO_MAX_PX - ESPACAMENTO_CABECALHO_MIN_PX)
  );
}

// Largura mínima de cada card de produto na grade (CSS grid auto-fill) —
// 0 = cards pequenos, mais colunas; 100 = cards grandes, menos colunas.
const TAMANHO_IMAGEM_MIN_PX = 130;
const TAMANHO_IMAGEM_MAX_PX = 340;

export function tamanhoImagemEmPx(tamanho: number | undefined): number | undefined {
  if (tamanho == null) return undefined;
  return TAMANHO_IMAGEM_MIN_PX + (tamanho / 100) * (TAMANHO_IMAGEM_MAX_PX - TAMANHO_IMAGEM_MIN_PX);
}

// Estilo do conteúdo sobreposto (título/botão) — usado tanto direto no
// banner (desktop, ou ambos se não houver override mobile) quanto dentro de
// `mobile` (todos opcionais lá: undefined em qualquer campo cai pro valor
// correspondente aqui fora, ver resolverConteudoBannerMobile).
const bannerConteudoEstiloSchema = z.object({
  alinhamentoHorizontal: alinhamentoTextoSchema.optional(),
  alinhamentoVertical: posicaoVerticalSchema.optional(),
  // Sem valor definido, mantém o fundo escuro/claro atrás do título+botão
  // (comportamento de antes dessa opção existir) — false tira esse bloco de
  // fundo, deixando só o texto (com sombra, pra continuar legível) sobre a
  // imagem. Não afeta o fundo próprio do botão, só o bloco atrás do título.
  mostrarFundo: z.boolean().optional(),
  // Sem valor definido, o botão segue o mesmo alinhamento horizontal do
  // título (comportamento de antes) — definido, o botão ganha uma posição
  // própria (ex.: título à esquerda, botão centralizado), útil quando o
  // título é comprido e o botão "seguindo" o texto fica torto.
  alinhamentoBotao: alinhamentoTextoSchema.optional(),
  // Fonte e tamanho do título são independentes dos do botão — sem valor
  // definido, cada um cai no padrão visual que já existia antes dessa
  // opção existir.
  fonteTitulo: z.enum(FONTES_TEMA).optional(),
  tamanhoTitulo: z.number().min(0).max(100).optional(),
  fonteBotao: z.enum(FONTES_TEMA).optional(),
  tamanhoFonteBotao: z.number().min(0).max(100).optional(),
  // Tamanho do botão em si (padding), diferente do tamanho da fonte do
  // texto dentro dele.
  tamanhoBotao: z.number().min(0).max(100).optional(),
  arredondamentoBotao: z.number().min(0).max(100).optional(),
  // Posição livre (arrastar no preview), em % da área do banner — quando
  // definida, tem prioridade sobre alinhamentoHorizontal/alinhamentoVertical
  // (que viram só a grade de 9 pontos, o modo "por encaixe"). Sem valor,
  // continua no modo grade de sempre.
  posicaoLivre: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .optional(),
});

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
  ...bannerConteudoEstiloSchema.shape,
  // Override específico do mobile pra posição/fonte/tamanho do conteúdo —
  // a imagem já tinha isso via urlMobile; isso completa pro texto/botão por
  // cima dela. Cada campo não definido aqui cai no valor de cima (desktop).
  mobile: bannerConteudoEstiloSchema.optional(),
});

export type BannerTema = z.infer<typeof bannerTemaSchema>;

// Resolve os valores efetivos de estilo do conteúdo pro mobile, herdando do
// desktop qualquer campo que não tenha override em `overridesMobile`.
// Genérico (não fixo em BannerTema) pra funcionar também com o tipo local
// de banner usado por BannerCarousel/ThemeRenderer.
export function resolverConteudoBannerMobile<T>(base: T, overridesMobile: Partial<T> | undefined): T {
  return { ...base, ...overridesMobile };
}

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
    tamanhoLogo: z.number().min(0).max(100).default(65),
    // Escala 0-100 mapeada para o espaço vertical (px) entre a linha de
    // logo/busca e a linha de categorias no layout desktop (ver
    // ESPACAMENTO_CABECALHO_MIN_PX/MAX_PX) — sem efeito no mobile.
    espacamentoLinhas: z.number().min(0).max(100).default(8),
    // Escala 0-100 mapeada para o tamanho de fonte do menu de categorias
    // (mesma conversão de tamanhoFonteEmPx usada nos textos de outras seções).
    tamanhoFonteCategorias: z.number().min(0).max(100).default(30),
    corFundo: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    // Cor do texto do cabeçalho (nome da loja, busca, menu de categorias
    // embutido) — independente da cor de texto do resto da página, já que o
    // fundo do cabeçalho também pode ser diferente do resto da página.
    corTexto: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
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
    // MANUAL (padrão) respeita produtosSelecionados/ordem escolhida pelo
    // lojista. MAIS_VENDIDOS ordena pela quantidade vendida (ver
    // lojaPublica.produtosMaisVendidos); LANCAMENTOS ordena por data de
    // criação (mais recente primeiro) — nenhum dos dois usa
    // produtosSelecionados. categoriaId continua funcionando como filtro em
    // qualquer modo (ex.: "mais vendidos" só de uma categoria).
    modo: z.enum(["MANUAL", "MAIS_VENDIDOS", "LANCAMENTOS"]).default("MANUAL"),
    // Quantos produtos mostrar — vazio/undefined mostra todos que passarem
    // no filtro (categoria, se houver). Aplica independente de categoriaId
    // estar definido ou não.
    quantidade: z.number().int().min(1).max(50).optional(),
    // Com categoriaId definido, o lojista pode escolher manualmente quais
    // produtos daquela categoria aparecem (e em que ordem) em vez do filtro
    // automático por categoria — lista de Produto.id. Ignorado se
    // categoriaId não estiver definido, ou se modo não for MANUAL.
    produtosSelecionados: z.array(z.string()).optional(),
    linkVerTudo: z.boolean().default(true),
    alinhamento: alinhamentoTextoSchema.default("ESQUERDA"),
    mostrarPreco: z.boolean().default(true),
    // No mobile, "CARROSSEL" mostra um produto por vez (estilo Pandora: foto
    // grande, variação e adicionar ao carrinho já visíveis), em vez da
    // grade normal. Desktop sempre usa grade, independente dessa opção.
    layoutMobile: z.enum(["GRADE", "CARROSSEL"]).default("GRADE"),
    // Escala 0-100 → largura mínima de cada card na grade (ver
    // TAMANHO_IMAGEM_PRODUTO_*_PX) — controla quantos produtos cabem por
    // linha. Sem valor definido, usa as colunas fixas por variante de
    // sempre (gridProdutosClassePorVariante).
    tamanhoImagem: z.number().min(0).max(100).optional(),
    // Só tem efeito quando layoutMobile é "CARROSSEL": liga/desliga a
    // seleção de variação + "Adicionar ao carrinho" nos slides — desligado,
    // o carrossel mostra só imagem/nome/preço, igual um card comum.
    mostrarComprarCarrossel: z.boolean().default(true),
    // Cor do botão "Adicionar ao carrinho" só nos cards desta seção (grade e
    // carrossel mobile) — independente da cor usada em outras seções/na
    // página do produto. Sem valor definido, usa o padrão do tema
    // (bg-foreground/text-background).
    corBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corTextoBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
  }),
});

// Banner menor que o Hero, pra promoção pontual entre outras seções da home
// (ex.: "Frete grátis acima de R$200", "Dia das Mães — 20% OFF") — reaproveita
// o mesmo formato de conteúdo do banner do Hero (imagem/vídeo, texto, botão,
// posicionamento), só com no máximo 1 banner (sem carrossel) e uma altura
// menor por padrão.
export const secaoBannerSecundarioSchema = secaoBaseSchema.extend({
  tipo: z.literal("BANNER_SECUNDARIO"),
  config: z.object({
    banner: bannerTemaSchema.optional(),
    altura: z.enum(["PEQUENA", "MEDIA", "GRANDE"]).default("PEQUENA"),
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
    // Mostra "a partir de R$X" (menor preço entre os produtos da categoria)
    // abaixo do nome — referência de mercado (Pandora), ajuda o cliente a
    // já ter noção de faixa de preço antes de entrar na categoria.
    mostrarPrecoApartirDe: z.boolean().default(false),
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
    // Coluna "Institucional" (páginas escritas pelo lojista, ver
    // server/trpc/routers/paginas-institucionais.ts) e coluna "SAC"
    // (WhatsApp + telefone da loja) — cada uma opcional, independente das
    // colunas de link genéricas abaixo.
    mostrarPaginasInstitucionais: z.boolean().default(false),
    mostrarSac: z.boolean().default(false),
    colunas: z.array(colunaRodapeSchema).max(4, "No máximo 4 colunas no rodapé.").default([]),
  }),
});

// Selos de confiança — seção compartilhada entre a home (tipo "SELOS") e a
// página de produto (tipo "SELOS_PRODUTO", ver mais abaixo), mesmo shape de
// config nos dois casos, já que representam a mesma coisa (parcelamento,
// troca fácil, entrega etc.) em lugares diferentes do site.
export const iconeSeloSchema = z.enum(["ENTREGA", "GARANTIA", "PAGAMENTO", "TROCA", "QUALIDADE"]);
export type IconeSelo = z.infer<typeof iconeSeloSchema>;

export const NOMES_ICONE_SELO: Record<IconeSelo, string> = {
  ENTREGA: "Entrega",
  GARANTIA: "Garantia",
  PAGAMENTO: "Pagamento seguro",
  TROCA: "Troca fácil",
  QUALIDADE: "Qualidade",
};

export const seloProdutoSchema = z.object({
  id: z.string(),
  icone: iconeSeloSchema.default("QUALIDADE"),
  titulo: z.string().trim().max(40),
  // Linha menor abaixo do título (opcional) — ex.: título "Troca fácil",
  // descrição "Não serviu? Trocamos gratuitamente em até 30 dias."
  descricao: z.string().trim().max(100).optional(),
});

export type SeloProduto = z.infer<typeof seloProdutoSchema>;

// Escala 0-100 → largura/altura do ícone em px, mesmo princípio de
// alturaLogoEmPx — sem valor definido, usa 30 como padrão (~28px, próximo do
// tamanho fixo que a seção sempre teve antes de virar configurável).
const TAMANHO_ICONE_SELO_MIN_PX = 16;
const TAMANHO_ICONE_SELO_MAX_PX = 48;

export function tamanhoIconeSeloEmPx(tamanho: number | undefined): number {
  const t = tamanho ?? 30;
  return TAMANHO_ICONE_SELO_MIN_PX + (t / 100) * (TAMANHO_ICONE_SELO_MAX_PX - TAMANHO_ICONE_SELO_MIN_PX);
}

// Conteúdo compartilhado entre home e produto — mora em Loja.selosConfig,
// não mais dentro da seção. Ver docs/superpowers/specs/2026-08-08-selos-confianca-unificados-design.md.
export const configSelosSchema = z.object({
  itens: z.array(seloProdutoSchema).max(6, "No máximo 6 selos."),
  corFundo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  // Cor da descrição (linha menor) de cada selo — o título tem cor própria
  // (corTitulo), independente desta.
  corTexto: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  corTitulo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  corIcone: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  tamanhoIcone: z.number().min(0).max(100).optional(),
  tamanhoTitulo: z.number().min(0).max(100).optional(),
});

export type ConfigSelos = z.infer<typeof configSelosSchema>;

export const CONFIG_SELOS_VAZIA: ConfigSelos = { itens: [] };

// Antes de Loja.selosConfig existir, o conteúdo dos selos vivia dentro do
// config da seção SELOS da home — usado como semente enquanto a loja não
// tiver salvo selosConfig pelo menos uma vez (ver rotas loja.atual e
// lojaPublica.porSlug). Lê o JSON bruto sem validar contra o schema atual
// (a seção antiga tinha itens/cores no próprio config), então tolera
// qualquer formato antigo ou ausente.
// Ao salvar uma logo em Configurações, ativa "Exibir: Logo" na seção
// Cabeçalho do tema — sem isso o cabeçalho continua mostrando o nome da loja
// em texto (exibicaoLogo é um campo separado de Loja.logoUrl) e o lojista
// não vê nenhuma mudança no site após o upload. Tolera qualquer formato de
// temaConfig (mesmo princípio de extrairSelosSemente) já que roda antes do
// parse pelo schema atual.
export function ativarExibicaoLogo(temaConfig: unknown): unknown {
  if (!temaConfig || typeof temaConfig !== "object") return temaConfig;
  const secoes = (temaConfig as { secoes?: unknown }).secoes;
  if (!Array.isArray(secoes)) return temaConfig;
  return {
    ...temaConfig,
    secoes: secoes.map((s) => {
      if (!s || typeof s !== "object" || (s as { tipo?: unknown }).tipo !== "CABECALHO") return s;
      const secao = s as { config?: unknown };
      return { ...secao, config: { ...(typeof secao.config === "object" ? secao.config : {}), exibicaoLogo: "LOGO" } };
    }),
  };
}

export function extrairSelosSemente(temaConfig: unknown): ConfigSelos {
  if (!temaConfig || typeof temaConfig !== "object") return CONFIG_SELOS_VAZIA;
  const secoes = (temaConfig as { secoes?: unknown }).secoes;
  if (!Array.isArray(secoes)) return CONFIG_SELOS_VAZIA;
  const secaoSelos = secoes.find(
    (s): s is { tipo: string; config?: unknown } =>
      Boolean(s) && typeof s === "object" && (s as { tipo?: unknown }).tipo === "SELOS",
  );
  const config = secaoSelos?.config;
  if (!config || typeof config !== "object" || !Array.isArray((config as { itens?: unknown }).itens)) {
    return CONFIG_SELOS_VAZIA;
  }
  return config as ConfigSelos;
}

// A seção em si só controla visibilidade/posição — o conteúdo vem de
// Loja.selosConfig (compartilhado com SELOS_PRODUTO).
export const secaoSelosSchema = secaoBaseSchema.extend({
  tipo: z.literal("SELOS"),
  config: z.object({}),
});

export const secaoTemaSchema = z.discriminatedUnion("tipo", [
  secaoBarraAnuncioSchema,
  secaoCabecalhoSchema,
  secaoHeroSchema,
  secaoMenuCategoriasSchema,
  secaoColecaoDestaqueSchema,
  secaoTextoSchema,
  secaoSelosSchema,
  secaoBannerSecundarioSchema,
  secaoRodapeSchema,
]);

export type SecaoTema = z.infer<typeof secaoTemaSchema>;
export type TipoSecaoTema = SecaoTema["tipo"];

export const estiloTemaSchema = z.object({
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
  corSecundaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  fonteTitulo: z.enum(FONTES_TEMA).default("INTER"),
  fonteCorpo: z.enum(FONTES_TEMA).default("INTER"),
  // Fundo de toda a página da loja (site inteiro, não só uma seção) — sem
  // valor definido, mantém o branco/neutro padrão do tema.
  corFundo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
  // Cor do texto de toda a página (site inteiro) — dá pro lojista corrigir a
  // legibilidade quando escolhe um corFundo escuro. Sem valor definido,
  // mantém a cor de texto padrão do tema.
  corTexto: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
    .optional(),
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
  SELOS: "Selos de confiança",
  BANNER_SECUNDARIO: "Banner secundário",
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

function criarId(): string {
  return crypto.randomUUID();
}

// ---------- Página de produto (Loja.temaProdutoConfig) ----------
//
// Mesmo princípio do temaConfig da home (Json puro, sobrescrito por inteiro a
// cada save, seções com `visivel`/ordem) só que descrevendo o layout da
// página de produto — aplicado a TODOS os produtos da loja, não um por
// produto. Galeria e Informações do produto são fixas (a página não faz
// sentido sem elas); as demais são o "Modelo" reordenável/removível, igual
// à home.

const secaoProdutoBaseSchema = z.object({
  id: z.string(),
  visivel: z.boolean().default(true),
});

export const secaoGaleriaProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("GALERIA_PRODUTO"),
  config: z.object({
    mostrarMiniaturas: z.boolean().default(true),
  }),
});

export const secaoInfoProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("INFO_PRODUTO"),
  config: z.object({
    mostrarBreadcrumb: z.boolean().default(true),
    mostrarDescricaoCurta: z.boolean().default(true),
    textoBotao: z.string().trim().max(40).default("Adicionar ao carrinho"),
    textoBotaoEsgotado: z.string().trim().max(40).default("Produto esgotado"),
    corBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corTextoBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    // Cor do título do produto (h1) — independente da cor do texto da
    // descrição curta e da cor do preço, cada uma editável separadamente.
    corTitulo: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corTexto: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corPreco: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
  }),
});

export const secaoDescricaoProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("DESCRICAO_PRODUTO"),
  config: z.object({
    titulo: z.string().trim().max(80).default("Descrição"),
  }),
});

export const secaoSelosProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("SELOS_PRODUTO"),
  config: z.object({}),
});

export const secaoTextoProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("TEXTO_PRODUTO"),
  config: z.object({
    titulo: z.string().trim().max(120).optional(),
    corpo: z.string().trim().max(2000),
    alinhamento: alinhamentoTextoSchema.default("ESQUERDA"),
  }),
});

// CATEGORIA: mesma categoria do produto atual, mais recentes primeiro (como
// sempre funcionou). MANUAL: lista fixa escolhida pelo lojista, igual em
// toda página de produto (o produto atual é removido da lista automaticamente
// se estiver nela). ALEATORIO: sorteia entre todos os produtos da loja a
// cada visita à página.
export const modoRelacionadosSchema = z.enum(["CATEGORIA", "MANUAL", "ALEATORIO"]);
export type ModoRelacionados = z.infer<typeof modoRelacionadosSchema>;

export const NOMES_MODO_RELACIONADOS: Record<ModoRelacionados, string> = {
  CATEGORIA: "Mesma categoria",
  MANUAL: "Escolher manualmente",
  ALEATORIO: "Aleatório",
};

export const secaoRelacionadosProdutoSchema = secaoProdutoBaseSchema.extend({
  tipo: z.literal("RELACIONADOS_PRODUTO"),
  config: z.object({
    titulo: z.string().trim().max(80).default("Você também pode gostar"),
    quantidade: z.number().int().min(1).max(20).optional(),
    modo: modoRelacionadosSchema.default("CATEGORIA"),
    // GRADE: grid fixo (como sempre foi). CARROSSEL: scroll horizontal com
    // setas, mostrando alguns cards por vez em qualquer tamanho de tela —
    // diferente do layoutMobile "CARROSSEL" da home (Coleção em destaque),
    // que é um produto por slide e só existe no mobile.
    layout: z.enum(["GRADE", "CARROSSEL"]).default("GRADE"),
    // Só usado quando modo é "MANUAL" — lista de Produto.id na ordem
    // escolhida pelo lojista, igual em toda página de produto.
    produtosSelecionados: z.array(z.string()).optional(),
    // Cor do botão "Adicionar ao carrinho" só nos cards desta seção —
    // independente da cor do botão de comprar da seção Informações do
    // produto (config.corBotao ali), que é o botão principal da página.
    corBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
    corTextoBotao: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB")
      .optional(),
  }),
});

export const secaoProdutoTemaSchema = z.discriminatedUnion("tipo", [
  secaoGaleriaProdutoSchema,
  secaoInfoProdutoSchema,
  secaoDescricaoProdutoSchema,
  secaoSelosProdutoSchema,
  secaoTextoProdutoSchema,
  secaoRelacionadosProdutoSchema,
]);

export type SecaoProdutoTema = z.infer<typeof secaoProdutoTemaSchema>;
export type TipoSecaoProdutoTema = SecaoProdutoTema["tipo"];

export const temaProdutoConfigSchema = z.object({
  secoes: z.array(secaoProdutoTemaSchema).max(20, "No máximo 20 seções na página de produto."),
});

export type TemaProdutoConfig = z.infer<typeof temaProdutoConfigSchema>;

// Galeria e Informações do produto sempre presentes — sem elas a página não
// tem como vender o produto (mesma trava de Cabeçalho/Rodapé na home).
export const TIPOS_SECAO_PRODUTO_FIXA: TipoSecaoProdutoTema[] = ["GALERIA_PRODUTO", "INFO_PRODUTO"];

export const NOMES_TIPO_SECAO_PRODUTO: Record<TipoSecaoProdutoTema, string> = {
  GALERIA_PRODUTO: "Galeria de fotos",
  INFO_PRODUTO: "Informações do produto",
  DESCRICAO_PRODUTO: "Descrição",
  SELOS_PRODUTO: "Selos de confiança",
  TEXTO_PRODUTO: "Texto livre",
  RELACIONADOS_PRODUTO: "Produtos relacionados",
};

/**
 * Layout inicial da página de produto, usado quando a loja ainda não
 * personalizou (temaProdutoConfig nulo) e o lojista abre o editor pela
 * primeira vez — reproduz a mesma composição que o componente fixo antigo
 * (ProdutoDetalhe) sempre teve, pra abrir o editor não mudar nada visualmente
 * até o lojista salvar.
 */
export function criarTemaProdutoConfigPadrao(): TemaProdutoConfig {
  return {
    secoes: [
      { id: criarId(), tipo: "GALERIA_PRODUTO", visivel: true, config: { mostrarMiniaturas: true } },
      {
        id: criarId(),
        tipo: "INFO_PRODUTO",
        visivel: true,
        config: {
          mostrarBreadcrumb: true,
          mostrarDescricaoCurta: true,
          textoBotao: "Adicionar ao carrinho",
          textoBotaoEsgotado: "Produto esgotado",
        },
      },
      {
        id: criarId(),
        tipo: "RELACIONADOS_PRODUTO",
        visivel: true,
        config: { titulo: "Você também pode gostar", modo: "CATEGORIA", layout: "GRADE" },
      },
    ],
  };
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
          tamanhoLogo: 65,
          espacamentoLinhas: 8,
          tamanhoFonteCategorias: 30,
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
        config: { tamanho: "MEDIO", alinhamento: "ESQUERDA", exibirEm: "AMBOS", mostrarPrecoApartirDe: false },
      },
      {
        id: criarId(),
        tipo: "COLECAO_DESTAQUE",
        visivel: true,
        config: {
          titulo: "Produtos",
          modo: "MANUAL",
          linkVerTudo: true,
          alinhamento: "ESQUERDA",
          mostrarPreco: true,
          layoutMobile: "GRADE",
          mostrarComprarCarrossel: true,
        },
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
          mostrarPaginasInstitucionais: false,
          mostrarSac: false,
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
