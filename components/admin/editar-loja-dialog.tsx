"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";

const editarLojaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da loja"),
  slug: z
    .string()
    .min(2, "Informe o endereço da loja")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  responsavel: z.string().min(2, "Informe o nome do responsável"),
  emailContato: z.string().email("Informe um e-mail válido"),
  planoId: z.string().optional(),
});

type EditarLojaFormValues = z.infer<typeof editarLojaSchema>;

export function EditarLojaDialog({
  open,
  onOpenChange,
  loja,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loja: {
    id: string;
    nome: string;
    slug: string;
    responsavel: string | null;
    emailContato: string | null;
    planoId: string | null;
  };
}) {
  const utils = trpc.useUtils();
  const { data: planos } = trpc.admin.listarPlanos.useQuery();
  const planoSelectItems = (planos ?? []).map((plano) => ({ value: plano.id, label: plano.nome }));

  const form = useForm<EditarLojaFormValues>({
    resolver: zodResolver(editarLojaSchema),
    defaultValues: {
      nome: loja.nome,
      slug: loja.slug,
      responsavel: loja.responsavel ?? "",
      emailContato: loja.emailContato ?? "",
      planoId: loja.planoId ?? undefined,
    },
  });

  // Reabre com os dados atuais da loja sempre que o dialog é aberto.
  useEffect(() => {
    if (open) {
      form.reset({
        nome: loja.nome,
        slug: loja.slug,
        responsavel: loja.responsavel ?? "",
        emailContato: loja.emailContato ?? "",
        planoId: loja.planoId ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loja.id]);

  const atualizar = trpc.admin.atualizarLoja.useMutation({
    onSuccess: (lojaAtualizada) => {
      utils.admin.obterLoja.invalidate({ id: loja.id });
      utils.admin.listarLojas.invalidate();
      toast.success(`Dados de "${lojaAtualizada.nome}" atualizados.`);
      onOpenChange(false);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível atualizar a loja.");
    },
  });

  function onSubmit(values: EditarLojaFormValues) {
    atualizar.mutate({ id: loja.id, ...values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar loja</DialogTitle>
          <DialogDescription>Altera os dados cadastrais desta loja.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da loja</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Loja da Ana" {...field} />
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
                  <FormLabel>Endereço (slug)</FormLabel>
                  <FormControl>
                    <Input placeholder="loja-da-ana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do lojista" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emailContato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail de contato</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="lojista@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <Select
                    items={planoSelectItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem plano (definir depois)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {planoSelectItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={atualizar.isPending}>
                {atualizar.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
