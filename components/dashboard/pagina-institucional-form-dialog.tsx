"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";
import type { PaginaInstitucional } from "@prisma/client";

const paginaSchema = z.object({
  titulo: z.string().trim().min(1, "Informe um título").max(120),
  conteudo: z.string().trim().max(20000),
});

type PaginaFormValues = z.infer<typeof paginaSchema>;

export function PaginaInstitucionalFormDialog({
  open,
  onOpenChange,
  pagina,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagina: PaginaInstitucional | null;
  onSalvo?: () => void;
}) {
  const form = useForm<PaginaFormValues>({
    resolver: zodResolver(paginaSchema),
    defaultValues: { titulo: "", conteudo: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ titulo: pagina?.titulo ?? "", conteudo: pagina?.conteudo ?? "" });
    }
  }, [open, pagina, form]);

  const criar = trpc.paginasInstitucionais.criar.useMutation();
  const atualizar = trpc.paginasInstitucionais.atualizar.useMutation();
  const salvando = criar.isPending || atualizar.isPending;

  async function onSubmit(values: PaginaFormValues) {
    try {
      if (pagina) {
        await atualizar.mutateAsync({ id: pagina.id, ...values });
        toast.success("Página atualizada.");
      } else {
        await criar.mutateAsync(values);
        toast.success("Página criada.");
      }
      onSalvo?.();
      onOpenChange(false);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível salvar a página.";
      toast.error(mensagem);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pagina ? "Editar página" : "Nova página"}</DialogTitle>
          <DialogDescription>
            O conteúdo aparece na página pública da loja. Deixe em branco para não publicar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Política de privacidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conteudo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea rows={10} placeholder="Escreva o conteúdo desta página..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
