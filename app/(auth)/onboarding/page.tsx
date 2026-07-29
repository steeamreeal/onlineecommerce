"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MODELOS = [
  {
    id: "moda",
    nome: "Moda e vestuário",
    descricao: "Destaque para fotos grandes de produto e variações.",
  },
  {
    id: "alimentos",
    nome: "Alimentos e bebidas",
    descricao: "Layout com destaque para categorias e pedido rápido.",
  },
  {
    id: "geral",
    nome: "Loja geral",
    descricao: "Catálogo simples, indicado para qualquer segmento.",
  },
] as const;

const CORES = [
  { id: "laranja", valor: "oklch(0.7 0.19 45)" },
  { id: "azul", valor: "oklch(0.6 0.19 250)" },
  { id: "verde", valor: "oklch(0.65 0.16 155)" },
  { id: "roxo", valor: "oklch(0.6 0.19 300)" },
  { id: "rosa", valor: "oklch(0.68 0.19 10)" },
] as const;

type DadosEmpresa = {
  nomeLoja: string;
  categoria: string;
  documento: string;
};

const STEPS = ["Modelo", "Empresa", "Identidade visual"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [modeloId, setModeloId] = useState<string>(MODELOS[0].id);
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>({
    nomeLoja: "",
    categoria: "",
    documento: "",
  });
  const [corId, setCorId] = useState<string>(CORES[0].id);
  const [logoNome, setLogoNome] = useState<string | null>(null);

  const podeAvancar =
    step === 0
      ? Boolean(modeloId)
      : step === 1
        ? dadosEmpresa.nomeLoja.trim().length >= 2 &&
          dadosEmpresa.categoria.trim().length > 0
        : true;

  function avancar() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Criação real da Loja (Prisma) chega no M8 — por ora só navega para a confirmação.
    router.push("/onboarding/sucesso");
  }

  function voltar() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Vamos criar sua loja</CardTitle>
        <CardDescription>
          Passo {step + 1} de {STEPS.length}: {STEPS[step]}
        </CardDescription>
        <ol className="mt-2 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "bg-primary/15 text-primary ring-1 ring-primary",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <CheckIcon className="size-3.5" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    i < step ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {MODELOS.map((modelo) => (
              <button
                key={modelo.id}
                type="button"
                onClick={() => setModeloId(modelo.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors",
                  modeloId === modelo.id
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-foreground/30",
                )}
              >
                <span className="font-medium">{modelo.nome}</span>
                <span className="text-muted-foreground text-sm">
                  {modelo.descricao}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nomeLoja">Nome da loja</Label>
              <Input
                id="nomeLoja"
                placeholder="Ex.: Camisetas da Ana"
                value={dadosEmpresa.nomeLoja}
                onChange={(e) =>
                  setDadosEmpresa((d) => ({ ...d, nomeLoja: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria">Categoria principal</Label>
              <Select
                value={dadosEmpresa.categoria}
                onValueChange={(v) =>
                  setDadosEmpresa((d) => ({ ...d, categoria: v ?? "" }))
                }
              >
                <SelectTrigger id="categoria" className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moda">Moda e vestuário</SelectItem>
                  <SelectItem value="alimentos">Alimentos e bebidas</SelectItem>
                  <SelectItem value="casa">Casa e decoração</SelectItem>
                  <SelectItem value="beleza">Beleza e cosméticos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="documento">CNPJ ou CPF (opcional)</Label>
              <Input
                id="documento"
                placeholder="Somente números"
                value={dadosEmpresa.documento}
                onChange={(e) =>
                  setDadosEmpresa((d) => ({ ...d, documento: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="logo">Logo da loja</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoNome(e.target.files?.[0]?.name ?? null)}
              />
              {logoNome && (
                <span className="text-muted-foreground text-sm">
                  Selecionado: {logoNome}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cor principal</Label>
              <div className="flex gap-3">
                {CORES.map((cor) => (
                  <button
                    key={cor.id}
                    type="button"
                    aria-label={cor.id}
                    onClick={() => setCorId(cor.id)}
                    className={cn(
                      "size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                      corId === cor.id && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: cor.valor }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="outline" onClick={voltar} disabled={step === 0}>
          Voltar
        </Button>
        <Button onClick={avancar} disabled={!podeAvancar}>
          {step === STEPS.length - 1 ? "Criar loja" : "Avançar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
