import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cupomStatus, type Cupom } from "@/lib/mocks/cupons";

const config = {
  ATIVO: { label: "Ativo", className: "bg-success/10 text-success" },
  EXPIRADO: { label: "Expirado", className: "bg-muted text-muted-foreground" },
  ESGOTADO: { label: "Esgotado", className: "bg-warning/10 text-warning" },
  AGENDADO: { label: "Agendado", className: "bg-primary/10 text-primary" },
} as const;

export function CupomStatusBadge({ cupom }: { cupom: Cupom }) {
  const { label, className } = config[cupomStatus(cupom)];
  return (
    <Badge variant="outline" className={cn("border-transparent", className)}>
      {label}
    </Badge>
  );
}
