import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusLoja } from "@/lib/mocks/lojas";

const config: Record<StatusLoja, { label: string; className: string }> = {
  ATIVA: {
    label: "Ativa",
    className: "bg-success/10 text-success",
  },
  BLOQUEADA: {
    label: "Bloqueada",
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
