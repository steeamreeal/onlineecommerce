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
import { trpc } from "@/lib/trpc/client";

const tipoSelectItems = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
];

export function AjustarEstoqueDialog({
  variacaoId,
  produtoNome,
  variacaoLabel,
  onRegistrado,
}: {
  variacaoId: string;
  produtoNome: string;
  variacaoLabel: string;
  onRegistrado?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");

  const registrarMovimento = trpc.estoque.registrarMovimento.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await registrarMovimento.mutateAsync({
        variacaoId,
        tipo,
        quantidade: Number(quantidade),
        motivo: motivo || undefined,
      });
      toast.success(
        `${tipo === "ENTRADA" ? "Entrada" : "Saída"} de ${quantidade} un. registrada para ${variacaoLabel}.`,
      );
      onRegistrado?.();
      setOpen(false);
      setQuantidade("");
      setMotivo("");
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível registrar o movimento.";
      toast.error(mensagem);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Ajustar estoque
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>
            {produtoNome} — {variacaoLabel}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Tipo de movimento</Label>
            <Select
              items={tipoSelectItems}
              value={tipo}
              onValueChange={(v) => setTipo(v as "ENTRADA" | "SAIDA")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input
              id="motivo"
              placeholder="Ex.: Compra de fornecedor, ajuste de inventário"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registrarMovimento.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
