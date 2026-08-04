"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { enviarBannerLoja } from "@/lib/supabase/storage";

type Banner = { id?: string; url: string; titulo: string };

const LIMITE_BANNERS = 3;

export function BannersLojaForm() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  const listaAtual = banners ?? (loja?.banners as Banner[] | null) ?? [];

  const salvar = trpc.loja.atualizarBanners.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Banners salvos com sucesso.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar os banners.");
    },
  });

  async function handleUploadImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !loja) return;

    setEnviandoImagem(true);
    try {
      const url = await enviarBannerLoja(loja.id, arquivo);
      setBanners([...listaAtual, { url, titulo: "" }]);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar a imagem. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviandoImagem(false);
    }
  }

  function atualizarTitulo(index: number, titulo: string) {
    setBanners(listaAtual.map((banner, i) => (i === index ? { ...banner, titulo } : banner)));
  }

  function removerBanner(index: number) {
    setBanners(listaAtual.filter((_, i) => i !== index));
  }

  function salvarBanners() {
    salvar.mutate({ banners: listaAtual.map((b) => ({ id: b.id, url: b.url, titulo: b.titulo })) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {listaAtual.map((banner, index) => (
          <div key={banner.id ?? banner.url} className="flex w-40 flex-col gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image */}
              <img
                src={banner.url}
                alt={banner.titulo || `Banner ${index + 1}`}
                className="aspect-video w-full rounded-md border object-cover"
              />
              <button
                type="button"
                onClick={() => removerBanner(index)}
                className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
              >
                <X className="size-3" />
              </button>
            </div>
            <Input
              placeholder="Título do banner"
              value={banner.titulo}
              onChange={(e) => atualizarTitulo(index, e.target.value)}
            />
          </div>
        ))}

        {listaAtual.length < LIMITE_BANNERS && (
          <label className="border-input hover:bg-accent flex aspect-video w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs has-disabled:pointer-events-none has-disabled:opacity-50">
            <Upload className="size-4" />
            {enviandoImagem ? "Enviando..." : "Adicionar banner"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={enviandoImagem || isLoading || !loja}
              onChange={handleUploadImagem}
            />
          </label>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={salvarBanners}
          disabled={salvar.isPending || isLoading}
        >
          {salvar.isPending ? "Salvando..." : "Salvar banners"}
        </Button>
      </div>
    </div>
  );
}
