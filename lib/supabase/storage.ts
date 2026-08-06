import { createClient } from "@/lib/supabase/client";

export const BUCKET_FOTOS_PRODUTO = "fotos-produtos";
export const BUCKET_BANNERS_LOJA = "banners-loja";
export const BUCKET_LOGOS_LOJA = "logos-loja";

// Sem esses limites no client, um arquivo grande demais ou de tipo errado só
// seria barrado (se barrado) pela configuração do bucket no Supabase, gerando
// um erro genérico e uma espera desnecessária de upload. Validamos aqui antes
// de gastar banda subindo o arquivo.
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const TAMANHO_MAXIMO_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPOS_VIDEO_ACEITOS = ["video/mp4", "video/webm"];

function extensaoArquivo(nomeArquivo: string): string {
  const partes = nomeArquivo.split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "jpg";
}

async function enviarArquivo(
  bucket: string,
  lojaId: string,
  arquivo: File,
  opcoes: { tiposAceitos: string[]; tamanhoMaximoBytes: number; mensagemTipoInvalido: string; mensagemTamanhoInvalido: string },
): Promise<string> {
  if (!opcoes.tiposAceitos.includes(arquivo.type)) {
    throw new Error(opcoes.mensagemTipoInvalido);
  }
  if (arquivo.size > opcoes.tamanhoMaximoBytes) {
    throw new Error(opcoes.mensagemTamanhoInvalido);
  }

  const supabase = createClient();
  const caminho = `${lojaId}/${crypto.randomUUID()}.${extensaoArquivo(arquivo.name)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error("Não foi possível enviar o arquivo. Tente novamente.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
}

async function enviarImagem(bucket: string, lojaId: string, arquivo: File): Promise<string> {
  return enviarArquivo(bucket, lojaId, arquivo, {
    tiposAceitos: TIPOS_ACEITOS,
    tamanhoMaximoBytes: TAMANHO_MAXIMO_BYTES,
    mensagemTipoInvalido: "Envie uma imagem em formato JPG, PNG, WEBP ou GIF.",
    mensagemTamanhoInvalido: "A imagem deve ter no máximo 5 MB.",
  });
}

async function enviarVideo(bucket: string, lojaId: string, arquivo: File): Promise<string> {
  return enviarArquivo(bucket, lojaId, arquivo, {
    tiposAceitos: TIPOS_VIDEO_ACEITOS,
    tamanhoMaximoBytes: TAMANHO_MAXIMO_VIDEO_BYTES,
    mensagemTipoInvalido: "Envie um vídeo em formato MP4 ou WEBM.",
    mensagemTamanhoInvalido: "O vídeo deve ter no máximo 20 MB.",
  });
}

/**
 * Faz upload de uma foto de produto para o bucket público do Supabase Storage,
 * dentro de uma pasta por loja (lojaId) para manter o isolamento entre tenants.
 * Retorna a URL pública do arquivo.
 */
export function enviarFotoProduto(lojaId: string, arquivo: File): Promise<string> {
  return enviarImagem(BUCKET_FOTOS_PRODUTO, lojaId, arquivo);
}

/**
 * Faz upload de um vídeo de produto para o mesmo bucket público das fotos de
 * produto (sem bucket dedicado — evita setup manual extra no Supabase),
 * dentro de uma pasta por loja (lojaId). Retorna a URL pública do arquivo.
 */
export function enviarVideoProduto(lojaId: string, arquivo: File): Promise<string> {
  return enviarVideo(BUCKET_FOTOS_PRODUTO, lojaId, arquivo);
}

/**
 * Faz upload de uma imagem de banner de loja para o bucket público do
 * Supabase Storage, dentro de uma pasta por loja (lojaId). Retorna a URL
 * pública do arquivo.
 */
export function enviarBannerLoja(lojaId: string, arquivo: File): Promise<string> {
  return enviarImagem(BUCKET_BANNERS_LOJA, lojaId, arquivo);
}

/**
 * Faz upload de um vídeo de banner de loja para o bucket público do
 * Supabase Storage, dentro de uma pasta por loja (lojaId). Retorna a URL
 * pública do arquivo.
 */
export function enviarVideoBannerLoja(lojaId: string, arquivo: File): Promise<string> {
  return enviarVideo(BUCKET_BANNERS_LOJA, lojaId, arquivo);
}

/**
 * Faz upload da logo da loja para o bucket público do Supabase Storage,
 * dentro de uma pasta por loja (lojaId). Retorna a URL pública do arquivo.
 */
export function enviarLogoLoja(lojaId: string, arquivo: File): Promise<string> {
  return enviarImagem(BUCKET_LOGOS_LOJA, lojaId, arquivo);
}
