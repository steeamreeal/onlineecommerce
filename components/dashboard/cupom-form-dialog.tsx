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

const tipoSelectItems = [
  { value: "PERCENTUAL", label: "Percentual" },
  { value: "VALOR_FIXO", label: "Valor fixo" },
  { value: "FRETE_GRATIS", label: "Frete grátis" },
];

const cupomSchema = z
  .object({
    codigo: z.string().min(3, "Informe um código com ao menos 3 caracteres"),
    tipo: z.enum(["PERCENTUAL", "VALOR_FIXO", "FRETE_GRATIS"]),
    valor: z.string().optional(),
    inicio: z.string().min(1, "Informe a data de início"),
    fim: z.string().min(1, "Informe a data de término"),
    limiteUso: z.string().optional(),
  })
  .refine((v) => v.tipo === "FRETE_GRATIS" || (v.valor && Number(v.valor) > 0), {
    message: "Informe um valor válido",
    path: ["valor"],
  })
  .refine((v) => new Date(v.fim) >= new Date(v.inicio), {
    message: "A data de término deve ser após o início",
    path: ["fim"],
  });

type CupomFormValues = z.infer<typeof cupomSchema>;

export function CupomFormDialog({
  open,
  onOpenChange,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCriado?: () => void;
}) {
  const form = useForm<CupomFormValues>({
    resolver: zodResolver(cupomSchema),
    defaultValues: {
      codigo: "",
      tipo: "PERCENTUAL",
      valor: "",
      inicio: "",
      fim: "",
      limiteUso: "",
    },
  });

  const criarCupom = trpc.cupons.criar.useMutation();

  async function onSubmit(values: CupomFormValues) {
    try {
      const cupom = await criarCupom.mutateAsync({
        codigo: values.codigo.toUpperCase(),
        tipo: values.tipo,
        valor: values.tipo === "FRETE_GRATIS" ? undefined : Number(values.valor),
        inicio: new Date(values.inicio),
        fim: new Date(values.fim),
        limiteUso: values.limiteUso ? Number(values.limiteUso) : undefined,
      });
      toast.success(`Cupom ${cupom.codigo} criado com sucesso.`);
      onCriado?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message ? error.message : "Não foi possível criar o cupom.";
      toast.error(mensagem);
    }
  }

  const tipo = form.watch("tipo");

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
          <DialogTitle>Novo cupom</DialogTitle>
          <DialogDescription>Configure o desconto e a vigência do cupom.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: BEMVINDO20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select items={tipoSelectItems} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                      <SelectItem value="VALOR_FIXO">Valor fixo</SelectItem>
                      <SelectItem value="FRETE_GRATIS">Frete grátis</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {tipo !== "FRETE_GRATIS" && (
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tipo === "PERCENTUAL" ? "Percentual (%)" : "Valor (R$)"}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="limiteUso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de uso</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criarCupom.isPending}>
                Criar cupom
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
