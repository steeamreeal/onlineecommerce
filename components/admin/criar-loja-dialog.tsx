"use client";

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

function slugificar(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const criarLojaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da loja"),
  slug: z
    .string()
    .min(2, "Informe o endereço da loja")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  responsavel: z.string().min(2, "Informe o nome do responsável"),
  emailContato: z.string().email("Informe um e-mail válido"),
  planoId: z.string().optional(),
});

type CriarLojaFormValues = z.infer<typeof criarLojaSchema>;

export function CriarLojaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { data: planos } = trpc.admin.listarPlanos.useQuery();
  const planoSelectItems = (planos ?? []).map((plano) => ({ value: plano.id, label: plano.nome }));

  const form = useForm<CriarLojaFormValues>({
    resolver: zodResolver(criarLojaSchema),
    defaultValues: { nome: "", slug: "", responsavel: "", emailContato: "", planoId: undefined },
  });

  const criar = trpc.admin.criarLoja.useMutation({
    onSuccess: (loja) => {
      utils.admin.listarLojas.invalidate();
      toast.success(`Loja "${loja.nome}" criada.`);
      form.reset();
      onOpenChange(false);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível criar a loja.");
    },
  });

  function onSubmit(values: CriarLojaFormValues) {
    criar.mutate(values);
  }

  // Preenche o slug automaticamente a partir do nome, só enquanto o usuário
  // não editou o campo de endereço manualmente.
  function aoMudarNome(nome: string, onChange: (v: string) => void) {
    onChange(nome);
    if (!form.formState.dirtyFields.slug) {
      form.setValue("slug", slugificar(nome));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova loja</DialogTitle>
          <DialogDescription>
            Cadastra a loja já pronta para o cliente — o lojista acessa pelo e-mail informado após
            o primeiro login.
          </DialogDescription>
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
                    <Input
                      placeholder="Ex.: Loja da Ana"
                      {...field}
                      onChange={(e) => aoMudarNome(e.target.value, field.onChange)}
                    />
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
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending ? "Criando..." : "Criar loja"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
