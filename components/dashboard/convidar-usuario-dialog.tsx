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
import { PAPEL_USUARIO_LABEL, type PapelUsuario, type UsuarioLoja } from "@/lib/mocks/usuarios";

const papelSelectItems = Object.entries(PAPEL_USUARIO_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const convidarSchema = z.object({
  nome: z.string().min(2, "Informe o nome"),
  email: z.string().email("Informe um e-mail válido"),
  papel: z.enum(["ADMINISTRADOR", "GERENTE", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"]),
});

type ConvidarFormValues = z.infer<typeof convidarSchema>;

export function ConvidarUsuarioDialog({
  open,
  onOpenChange,
  onConvidar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvidar: (usuario: UsuarioLoja) => void;
}) {
  const form = useForm<ConvidarFormValues>({
    resolver: zodResolver(convidarSchema),
    defaultValues: { nome: "", email: "", papel: "VENDEDOR" },
  });

  function onSubmit(values: ConvidarFormValues) {
    // Mock: sem persistência real ainda (chega no M8, autenticação e papéis reais)
    const usuario: UsuarioLoja = {
      id: `user-${crypto.randomUUID()}`,
      nome: values.nome,
      email: values.email,
      papel: values.papel as PapelUsuario,
      createdAt: new Date().toISOString(),
    };
    onConvidar(usuario);
    toast.success(`Convite enviado para ${values.email}.`);
    form.reset();
    onOpenChange(false);
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
          <DialogDescription>Defina o papel de acesso ao painel da loja.</DialogDescription>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              <Button type="submit">Enviar convite</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
