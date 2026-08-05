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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";

const convidarSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
});

type ConvidarFormValues = z.infer<typeof convidarSchema>;

export function ConvidarAdminLojaDialog({
  open,
  onOpenChange,
  lojaId,
  emailSugerido,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lojaId: string;
  emailSugerido?: string | null;
}) {
  const form = useForm<ConvidarFormValues>({
    resolver: zodResolver(convidarSchema),
    defaultValues: { email: emailSugerido ?? "" },
  });

  const convidar = trpc.admin.convidarAdministrador.useMutation({
    onSuccess: (_, values) => {
      toast.success(`Convite enviado para ${values.email}.`);
      form.reset();
      onOpenChange(false);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível enviar o convite.");
    },
  });

  function onSubmit(values: ConvidarFormValues) {
    convidar.mutate({ lojaId, email: values.email });
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
          <DialogTitle>Convidar administrador da loja</DialogTitle>
          <DialogDescription>
            Envia um convite por e-mail para que a pessoa crie a senha e acesse o painel desta loja
            como Administrador.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="lojista@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={convidar.isPending}>
                {convidar.isPending ? "Enviando..." : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
