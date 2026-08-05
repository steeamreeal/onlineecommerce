"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPO_FRETE_LABEL, type TipoFrete } from "@/lib/frete";
import { trpc } from "@/lib/trpc/client";

const tipoSelectItems = Object.entries(TIPO_FRETE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export function NovaOpcaoFreteDialog({ onCriado }: { onCriado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoFrete>("RETIRADA");
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [freteGratisAcimaDe, setFreteGratisAcimaDe] = useState("");

  const criar = trpc.frete.criar.useMutation();

  function limpar() {
    setTipo("RETIRADA");
    setNome("");
    setValor("");
    setFreteGratisAcimaDe("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await criar.mutateAsync({
        tipo,
        nome,
        valor: valor ? Number(valor) : undefined,
        freteGratisAcimaDe: freteGratisAcimaDe ? Number(freteGratisAcimaDe) : undefined,
      });
      toast.success(`Opção de frete "${nome}" criada.`);
      onCriado?.();
      setOpen(false);
      limpar();
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível criar a opção de frete.";
      toast.error(mensagem);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nova opção de frete</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova opção de frete</DialogTitle>
          <DialogDescription>
            Defina como os clientes podem receber os pedidos desta loja.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select items={tipoSelectItems} value={tipo} onValueChange={(v) => setTipo(v as TipoFrete)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipoSelectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex.: Retirada na loja, Entrega expressa"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              min="0"
              step="0.01"
              placeholder="Deixe em branco para grátis ou calculado no checkout"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="freteGratisAcimaDe">Frete grátis acima de (R$)</Label>
            <Input
              id="freteGratisAcimaDe"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Opcional"
              value={freteGratisAcimaDe}
              onChange={(e) => setFreteGratisAcimaDe(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
