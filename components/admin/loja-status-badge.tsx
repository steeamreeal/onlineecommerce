import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusLoja = "ATIVO" | "BLOQUEADO" | "CANCELADO" | "TESTE";

const config: Record<StatusLoja, { label: string; className: string }> = {
  ATIVO: {
    label: "Ativa",
    className: "bg-success/10 text-success",
  },
  BLOQUEADO: {
    label: "Bloqueada",
    className: "bg-destructive/10 text-destructive",
  },
  CANCELADO: {
    label: "Cancelada",
    className: "bg-destructive/10 text-destructive",
  },
  TESTE: {
    label: "Teste",
    className: "bg-primary/10 text-primary",
  },
};

export function LojaStatusBadge({ status }: { status: StatusLoja }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", className)}>
      {label}
    </Badge>
  );
}
