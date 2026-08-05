"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLink, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";
import { enviarLogoLoja } from "@/lib/supabase/storage";
import { CORES_PRIMARIAS_SUGERIDAS } from "@/lib/cores-loja";
import { DominioProprioForm } from "@/components/dashboard/dominio-proprio-form";
import { TemplateLojaForm } from "@/components/dashboard/template-loja-form";
import { BannersLojaForm } from "@/components/dashboard/banners-loja-form";

const lojaSchema = z.object({
  corPrimaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Informe uma cor no formato #RRGGBB"),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  endereco: z.string().optional(),
  horarioAtend: z.string().optional(),
  politicas: z.string().optional(),
});

type LojaFormValues = z.infer<typeof lojaSchema>;

export function LojaForm() {
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  const logoAtual = logoUrl !== undefined ? logoUrl : (loja?.logoUrl ?? null);

  const plataforma = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "plataforma.com";
  const urlLojaPublica = `${plataforma.startsWith("localhost") ? "http" : "https"}://${plataforma}`;

  const form = useForm<LojaFormValues>({
    resolver: zodResolver(lojaSchema),
    values: {
      corPrimaria: loja?.corPrimaria ?? "#EA580C",
      whatsapp: loja?.whatsapp ?? "",
      instagram: loja?.instagram ?? "",
      facebook: loja?.facebook ?? "",
      endereco: loja?.endereco ?? "",
      horarioAtend: loja?.horarioAtend ?? "",
      politicas: loja?.politicas ?? "",
    },
  });

  const salvar = trpc.loja.atualizarIdentidade.useMutation({
    onSuccess: () => {
      utils.loja.atual.invalidate();
      toast.success("Configurações da loja salvas com sucesso.");
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar as configurações.");
    },
  });

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !loja) return;

    setEnviandoLogo(true);
    try {
      const url = await enviarLogoLoja(loja.id, arquivo);
      setLogoUrl(url);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar a logo. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviandoLogo(false);
    }
  }

  function onSubmit(values: LojaFormValues) {
    salvar.mutate({ ...values, logoUrl: logoAtual });
  }

  return (
    <div className="flex flex-col gap-8">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-8"
        >
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Identidade</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <FormLabel>Nome da loja</FormLabel>
                <Input value={loja?.nome ?? ""} disabled />
                <p className="text-muted-foreground text-xs">
                  Nome e URL da loja são definidos pela plataforma. Fale com o suporte para alterar.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <FormLabel>URL da loja</FormLabel>
                <Input value={loja?.slug ?? ""} disabled />
                <p className="text-muted-foreground text-xs">
                  {plataforma}/loja/{loja?.slug || "minha-loja"}
                </p>
                {loja?.slug && (
                  <a
                    href={`${urlLojaPublica}/loja/${loja.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Visitar loja
                  </a>
                )}
              </div>
              <FormField
                control={form.control}
                name="corPrimaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor primária</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="h-9 w-12 rounded-md border"
                          />
                          <Input {...field} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {CORES_PRIMARIAS_SUGERIDAS.map((cor) => (
                            <button
                              key={cor.hex}
                              type="button"
                              title={cor.nome}
                              onClick={() => field.onChange(cor.hex)}
                              style={{ backgroundColor: cor.hex }}
                              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                                field.value.toLowerCase() === cor.hex.toLowerCase()
                                  ? "border-foreground"
                                  : "border-transparent"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-2">
                <FormLabel>Logo</FormLabel>
                <div className="flex items-center gap-4">
                  {logoAtual && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage */}
                      <img
                        src={logoAtual}
                        alt="Logo da loja"
                        className="size-16 rounded-md border object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )}
                  <label className="border-input hover:bg-accent flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] has-disabled:pointer-events-none has-disabled:opacity-50">
                    <Upload className="size-4" />
                    {enviandoLogo ? "Enviando..." : "Enviar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={enviandoLogo || isLoading || !loja}
                      onChange={handleUploadLogo}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Contato e redes sociais</h2>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 91234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="@minhaloja" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">
              Endereço, horário e políticas
            </h2>
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="horarioAtend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de atendimento</FormLabel>
                  <FormControl>
                    <Input placeholder="Seg. a sex., 9h às 18h" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="politicas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Políticas da loja</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Trocas, devoluções, garantia..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={salvar.isPending || isLoading}>
              {salvar.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </Form>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Banners</h2>
        <p className="text-muted-foreground text-sm">
          Até 3 banners (imagem ou vídeo). O primeiro é usado como destaque na página inicial da
          loja. Proporção recomendada: 3:1 (ex.: 1800×600px). Vídeos em MP4/WEBM, até 20MB.
        </p>
        <BannersLojaForm />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Template da loja</h2>
        <p className="text-muted-foreground text-sm">
          Escolha o layout da vitrine pública. A cor primária definida acima é aplicada
          automaticamente em cada template.
        </p>
        <TemplateLojaForm />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Domínio personalizado</h2>
        <DominioProprioForm />
      </section>
    </div>
  );
}
