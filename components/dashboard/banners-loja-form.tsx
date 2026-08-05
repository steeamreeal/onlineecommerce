"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { enviarBannerLoja, enviarVideoBannerLoja } from "@/lib/supabase/storage";

type TipoBanner = "IMAGEM" | "VIDEO";
type Banner = {
  id?: string;
  url: string;
  titulo: string;
  tipo: TipoBanner;
  urlMobile?: string;
  tipoMobile?: TipoBanner;
};

const LIMITE_BANNERS = 3;

function MidiaPreview({
  url,
  tipo,
  titulo,
  className,
}: {
  url: string;
  tipo: TipoBanner;
  titulo?: string;
  className: string;
}) {
  if (tipo === "VIDEO") {
    return <video src={url} className={className} muted loop playsInline autoPlay />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
    <img src={url} alt={titulo || "Banner"} className={className} />
  );
}

export function BannersLojaForm() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [enviandoIndex, setEnviandoIndex] = useState<number | "novo" | null>(null);

  const bannersSalvos = (loja?.banners as Banner[] | null) ?? [];
  const listaAtual: Banner[] =
    banners ?? bannersSalvos.map((b) => ({ ...b, tipo: b.tipo ?? "IMAGEM" }));

  const salvar = trpc.loja.atualizarBanners.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Banners salvos com sucesso.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar os banners.");
    },
  });

  async function enviarArquivo(arquivo: File): Promise<{ url: string; tipo: TipoBanner }> {
    if (!loja) throw new Error("Loja não carregada.");
    const ehVideo = arquivo.type.startsWith("video/");
    const url = ehVideo
      ? await enviarVideoBannerLoja(loja.id, arquivo)
      : await enviarBannerLoja(loja.id, arquivo);
    return { url, tipo: ehVideo ? "VIDEO" : "IMAGEM" };
  }

  async function handleUploadPrincipal(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !loja) return;

    setEnviandoIndex("novo");
    try {
      const { url, tipo } = await enviarArquivo(arquivo);
      setBanners([...listaAtual, { url, titulo: "", tipo }]);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar o arquivo. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviandoIndex(null);
    }
  }

  async function handleUploadMobile(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !loja) return;

    setEnviandoIndex(index);
    try {
      const { url, tipo } = await enviarArquivo(arquivo);
      setBanners(
        listaAtual.map((b, i) => (i === index ? { ...b, urlMobile: url, tipoMobile: tipo } : b)),
      );
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar o arquivo. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviandoIndex(null);
    }
  }

  function removerVersaoMobile(index: number) {
    setBanners(
      listaAtual.map((b, i) => (i === index ? { ...b, urlMobile: undefined, tipoMobile: undefined } : b)),
    );
  }

  function atualizarTitulo(index: number, titulo: string) {
    setBanners(listaAtual.map((banner, i) => (i === index ? { ...banner, titulo } : banner)));
  }

  function removerBanner(index: number) {
    setBanners(listaAtual.filter((_, i) => i !== index));
  }

  function salvarBanners() {
    salvar.mutate({
      banners: listaAtual.map((b) => ({
        id: b.id,
        url: b.url,
        titulo: b.titulo,
        tipo: b.tipo,
        urlMobile: b.urlMobile,
        tipoMobile: b.tipoMobile,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-6">
        {listaAtual.map((banner, index) => (
          <div key={banner.id ?? banner.url} className="flex w-80 flex-col gap-3 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">Desktop</p>
                <div className="relative">
                  <MidiaPreview
                    url={banner.url}
                    tipo={banner.tipo}
                    titulo={banner.titulo}
                    className="aspect-[3/1] w-full rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removerBanner(index)}
                    className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
                    aria-label="Remover banner"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">
                Versão mobile (opcional — usa a de desktop se não enviar)
              </p>
              {banner.urlMobile ? (
                <div className="relative w-24">
                  <MidiaPreview
                    url={banner.urlMobile}
                    tipo={banner.tipoMobile ?? "IMAGEM"}
                    titulo={banner.titulo}
                    className="aspect-[4/5] w-full rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removerVersaoMobile(index)}
                    className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
                    aria-label="Remover versão mobile"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="border-input hover:bg-accent flex aspect-[4/5] w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] has-disabled:pointer-events-none has-disabled:opacity-50">
                  <Upload className="size-3" />
                  {enviandoIndex === index ? "Enviando..." : "Adicionar"}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    className="hidden"
                    disabled={enviandoIndex !== null || isLoading || !loja}
                    onChange={(e) => handleUploadMobile(index, e)}
                  />
                </label>
              )}
            </div>

            <Input
              placeholder="Título do banner"
              value={banner.titulo}
              onChange={(e) => atualizarTitulo(index, e.target.value)}
            />
          </div>
        ))}

        {listaAtual.length < LIMITE_BANNERS && (
          <label className="border-input hover:bg-accent flex aspect-[3/1] w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs has-disabled:pointer-events-none has-disabled:opacity-50">
            <Upload className="size-4" />
            {enviandoIndex === "novo" ? "Enviando..." : "Adicionar banner"}
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              disabled={enviandoIndex !== null || isLoading || !loja}
              onChange={handleUploadPrincipal}
            />
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={salvarBanners} disabled={salvar.isPending || isLoading}>
          {salvar.isPending ? "Salvando..." : "Salvar banners"}
        </Button>
      </div>
    </div>
  );
}
