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

const PAPEL_ADMIN_LABEL = {
  SUPER_ADMIN: "Super admin",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
} as const;

const papelSelectItems = Object.entries(PAPEL_ADMIN_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const convidarSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  papel: z.enum(["SUPER_ADMIN", "SUPORTE", "FINANCEIRO"]),
});

type ConvidarFormValues = z.infer<typeof convidarSchema>;

export function ConvidarAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const form = useForm<ConvidarFormValues>({
    resolver: zodResolver(convidarSchema),
    defaultValues: { email: "", papel: "SUPORTE" },
  });

  const conceder = trpc.admin.concederAcessoPlataforma.useMutation({
    onSuccess: (_, values) => {
      utils.admin.listarUsuariosPlataforma.invalidate();
      toast.success(`Acesso concedido para ${values.email}.`);
      form.reset();
      onOpenChange(false);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível conceder acesso.");
    },
  });

  function onSubmit(values: ConvidarFormValues) {
    conceder.mutate(values);
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
          <DialogTitle>Conceder acesso ao painel administrativo</DialogTitle>
          <DialogDescription>
            O usuário precisa já ter feito login na plataforma pelo menos uma vez. Defina o papel
            de acesso ao painel administrativo do SaaS.
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
              <Button type="submit" disabled={conceder.isPending}>
                Conceder acesso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
