"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { configuracaoLojaMock } from "@/lib/mocks/loja";
import { DominioProprioForm } from "@/components/dashboard/dominio-proprio-form";

const lojaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da loja"),
  slug: z
    .string()
    .min(2, "Informe a URL da loja")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
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
  const form = useForm<LojaFormValues>({
    resolver: zodResolver(lojaSchema),
    defaultValues: {
      nome: configuracaoLojaMock.nome,
      slug: configuracaoLojaMock.slug,
      corPrimaria: configuracaoLojaMock.corPrimaria,
      whatsapp: configuracaoLojaMock.whatsapp ?? "",
      instagram: configuracaoLojaMock.instagram ?? "",
      facebook: configuracaoLojaMock.facebook ?? "",
      endereco: configuracaoLojaMock.endereco ?? "",
      horarioAtend: configuracaoLojaMock.horarioAtend ?? "",
      politicas: configuracaoLojaMock.politicas ?? "",
    },
  });

  function onSubmit() {
    // Mock: sem persistência real ainda (chega no M14, personalização real da loja)
    toast.success("Configurações da loja salvas com sucesso.");
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
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da loja</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da loja</FormLabel>
                    <FormControl>
                      <Input placeholder="minha-loja" {...field} />
                    </FormControl>
                    <FormDescription>
                      plataforma.com/loja/{field.value || "minha-loja"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="corPrimaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor primária</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-9 w-12 rounded-md border"
                        />
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

          <Separator />

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Banners</h2>
            <div className="grid grid-cols-3 gap-4">
              {configuracaoLojaMock.banners.map((banner) => (
                <div
                  key={banner.id}
                  className="bg-muted flex aspect-video items-center justify-center rounded-lg border"
                >
                  <span className="text-muted-foreground px-3 text-center text-xs">
                    {banner.titulo}
                  </span>
                </div>
              ))}
              <div className="text-muted-foreground flex aspect-video items-center justify-center rounded-lg border border-dashed text-xs">
                Adicionar banner
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </Form>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Domínio personalizado</h2>
        <DominioProprioForm />
      </section>
    </div>
  );
}
