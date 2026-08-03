"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";

const dominioSchema = z.object({
  dominioProprio: z
    .string()
    .trim()
    .toLowerCase()
    .refine((valor) => valor === "" || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(valor), {
      message: "Informe um domínio válido, ex.: www.minhaloja.com.br",
    }),
});

type DominioFormValues = z.infer<typeof dominioSchema>;

// Único campo desta tela de personalização já conectado a dado real —
// o resto de LojaForm segue mockado até o backend de personalização geral
// da loja ser feito. Isolado num componente próprio para não confundir os
// dois no mesmo formulário.
export function DominioProprioForm() {
  const [instrucoesPara, setInstrucoesPara] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();

  const form = useForm<DominioFormValues>({
    resolver: zodResolver(dominioSchema),
    values: { dominioProprio: loja?.dominioProprio ?? "" },
  });

  const salvar = trpc.loja.atualizarDominioProprio.useMutation({
    onSuccess: (resultado) => {
      utils.loja.atual.invalidate();
      toast.success(
        resultado.dominioProprio
          ? "Domínio salvo. Configure o DNS para ativá-lo."
          : "Domínio personalizado removido.",
      );
      setInstrucoesPara(resultado.dominioProprio);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar o domínio.");
    },
  });

  function onSubmit(values: DominioFormValues) {
    salvar.mutate({ dominioProprio: values.dominioProprio || null });
  }

  const dominioAtivo = instrucoesPara ?? loja?.dominioProprio;
  const plataforma = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "plataforma.com";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="dominioProprio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domínio personalizado</FormLabel>
              <FormControl>
                <Input placeholder="www.minhaloja.com.br" disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>
                Opcional. Deixe em branco e salve para remover um domínio já configurado.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {dominioAtivo && (
          <div className="bg-muted rounded-lg border p-4 text-sm">
            <p className="font-medium">Configure o DNS do seu domínio</p>
            <p className="text-muted-foreground mt-1">
              No painel do seu provedor de domínio, crie um registro CNAME apontando{" "}
              <code className="bg-background rounded px-1 py-0.5">{dominioAtivo}</code> para{" "}
              <code className="bg-background rounded px-1 py-0.5">{plataforma}</code>.
            </p>
            <p className="text-muted-foreground mt-2">
              A propagação do DNS pode levar algumas horas. Depois de propagado, acessar{" "}
              {dominioAtivo} vai levar direto para sua loja.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={salvar.isPending || isLoading}>
            {salvar.isPending ? "Salvando..." : "Salvar domínio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
