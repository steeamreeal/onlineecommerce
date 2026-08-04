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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";

const planoSchema = z.object({
  nome: z.string().min(2, "Informe um nome"),
  precoMensal: z
    .string()
    .min(1, "Informe um valor")
    .refine((v) => Number(v) > 0, "Informe um valor maior que zero"),
  stripePriceId: z.string().optional(),
  limiteProdutos: z.string().optional(),
  limiteUsuarios: z.string().optional(),
});

type PlanoFormValues = z.infer<typeof planoSchema>;

type PlanoParaEditar = {
  id: string;
  nome: string;
  precoMensal: { toString(): string };
  stripePriceId: string | null;
  limiteProdutos: number | null;
  limiteUsuarios: number | null;
};

const valoresPadrao: PlanoFormValues = {
  nome: "",
  precoMensal: "",
  stripePriceId: "",
  limiteProdutos: "",
  limiteUsuarios: "",
};

function paraFormValues(plano: PlanoParaEditar): PlanoFormValues {
  return {
    nome: plano.nome,
    precoMensal: plano.precoMensal.toString(),
    stripePriceId: plano.stripePriceId ?? "",
    limiteProdutos: plano.limiteProdutos != null ? String(plano.limiteProdutos) : "",
    limiteUsuarios: plano.limiteUsuarios != null ? String(plano.limiteUsuarios) : "",
  };
}

export function PlanoDialog({
  open,
  onOpenChange,
  plano,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano?: PlanoParaEditar;
}) {
  const utils = trpc.useUtils();
  const form = useForm<PlanoFormValues>({
    resolver: zodResolver(planoSchema),
    defaultValues: plano ? paraFormValues(plano) : valoresPadrao,
  });

  useEffect(() => {
    if (open) {
      form.reset(plano ? paraFormValues(plano) : valoresPadrao);
    }
  }, [open, plano, form]);

  const aoConcluir = () => {
    utils.admin.listarPlanos.invalidate();
    toast.success(plano ? "Plano atualizado." : "Plano criado.");
    onOpenChange(false);
  };

  const aoFalhar = (mensagemPadrao: string) => (erro: { message?: string }) => {
    toast.error(erro.message || mensagemPadrao);
  };

  const criar = trpc.admin.criarPlano.useMutation({
    onSuccess: aoConcluir,
    onError: aoFalhar("Não foi possível criar o plano."),
  });

  const atualizar = trpc.admin.atualizarPlano.useMutation({
    onSuccess: aoConcluir,
    onError: aoFalhar("Não foi possível atualizar o plano."),
  });

  function onSubmit(values: PlanoFormValues) {
    const data = {
      nome: values.nome,
      precoMensal: Number(values.precoMensal),
      stripePriceId: values.stripePriceId || undefined,
      limiteProdutos: values.limiteProdutos ? Number(values.limiteProdutos) : undefined,
      limiteUsuarios: values.limiteUsuarios ? Number(values.limiteUsuarios) : undefined,
    };

    if (plano) {
      atualizar.mutate({ id: plano.id, ...data });
    } else {
      criar.mutate(data);
    }
  }

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) form.reset(valoresPadrao);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plano ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>
            Defina o valor da mensalidade e vincule o Price ID do Stripe correspondente — sem ele
            o plano não aparece para assinatura no painel do lojista.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Plano Pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precoMensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço mensal (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stripePriceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stripe Price ID</FormLabel>
                  <FormControl>
                    <Input placeholder="price_..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limiteProdutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de produtos</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Ilimitado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="limiteUsuarios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de usuários</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Ilimitado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {plano ? "Salvar alterações" : "Criar plano"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
