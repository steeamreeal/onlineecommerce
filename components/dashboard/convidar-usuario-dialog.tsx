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
import { PAPEL_USUARIO_LABEL } from "@/lib/papel-usuario";
import { trpc } from "@/lib/trpc/client";

// DONO nunca é atribuído por convite — só por transferência entre membros
// já existentes (ver usuarios-lista.tsx).
const papelSelectItems = Object.entries(PAPEL_USUARIO_LABEL)
  .filter(([value]) => value !== "DONO")
  .map(([value, label]) => ({ value, label }));

const convidarSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  papel: z.enum(["ADMINISTRADOR", "GERENTE", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"]),
});

type ConvidarFormValues = z.infer<typeof convidarSchema>;

export function ConvidarUsuarioDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const form = useForm<ConvidarFormValues>({
    resolver: zodResolver(convidarSchema),
    defaultValues: { email: "", papel: "VENDEDOR" },
  });

  const convidar = trpc.usuariosLoja.convidar.useMutation({
    onSuccess: (_, values) => {
      utils.usuariosLoja.listar.invalidate();
      toast.success(`Convite enviado para ${values.email}.`);
      form.reset();
      onOpenChange(false);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível enviar o convite.");
    },
  });

  function onSubmit(values: ConvidarFormValues) {
    convidar.mutate(values);
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
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            Enviamos um e-mail de convite com um link para criar acesso ao painel da loja.
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
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="papel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <Select items={papelSelectItems} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {papelSelectItems.map((item) => (
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
