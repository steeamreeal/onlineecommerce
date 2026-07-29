import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusProduto } from "@/lib/mocks/produtos";

const config: Record<StatusProduto, { label: string; className: string }> = {
  ATIVO: {
    label: "Ativo",
    className: "bg-success/10 text-success",
  },
  INATIVO: {
    label: "Inativo",
    className: "bg-muted text-muted-foreground",
  },
  DESTAQUE: {
    label: "Destaque",
    className: "bg-primary/10 text-primary",
  },
};

export function ProdutoStatusBadge({ status }: { status: StatusProduto }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", className)}>
      {label}
    </Badge>
  );
}
