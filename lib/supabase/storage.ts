import { createClient } from "@/lib/supabase/client";

export const BUCKET_FOTOS_PRODUTO = "fotos-produtos";
export const BUCKET_BANNERS_LOJA = "banners-loja";

// Sem esses limites no client, um arquivo grande demais ou de tipo errado só
// seria barrado (se barrado) pela configuração do bucket no Supabase, gerando
// um erro genérico e uma espera desnecessária de upload. Validamos aqui antes
// de gastar banda subindo o arquivo.
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function extensaoArquivo(nomeArquivo: string): string {
  const partes = nomeArquivo.split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "jpg";
}

async function enviarImagem(bucket: string, lojaId: string, arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new Error("Envie uma imagem em formato JPG, PNG, WEBP ou GIF.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const supabase = createClient();
  const caminho = `${lojaId}/${crypto.randomUUID()}.${extensaoArquivo(arquivo.name)}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error("Não foi possível enviar a imagem. Tente novamente.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
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
 * Faz upload de uma imagem de banner de loja para o bucket público do
 * Supabase Storage, dentro de uma pasta por loja (lojaId). Retorna a URL
 * pública do arquivo.
 */
export function enviarBannerLoja(lojaId: string, arquivo: File): Promise<string> {
  return enviarImagem(BUCKET_BANNERS_LOJA, lojaId, arquivo);
}
