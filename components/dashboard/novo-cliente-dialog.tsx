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
import { trpc } from "@/lib/trpc/client";

export function NovoClienteDialog({ onCriado }: { onCriado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const criar = trpc.clientes.criar.useMutation();

  function limpar() {
    setNome("");
    setTelefone("");
    setEmail("");
    setCidade("");
    setEstado("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await criar.mutateAsync({
        nome,
        telefone: telefone || undefined,
        email: email || undefined,
        enderecos:
          cidade && estado
            ? [{ rua: "", cidade, estado, cep: "", principal: true }]
            : [],
      });
      toast.success(`Cliente "${nome}" cadastrado.`);
      onCriado?.();
      setOpen(false);
      limpar();
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível cadastrar o cliente.";
      toast.error(mensagem);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Novo cliente</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre um cliente manualmente. O total gasto e a última compra aparecem
            automaticamente conforme os pedidos forem registrados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 91234-5678"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Opcional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                placeholder="Opcional"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                placeholder="Ex.: SP"
                maxLength={2}
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
