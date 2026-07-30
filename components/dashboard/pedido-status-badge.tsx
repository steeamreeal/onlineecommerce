import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_PEDIDO_LABEL } from "@/lib/pedidos";
import type { StatusPedido } from "@prisma/client";

const classNamePorStatus: Record<StatusPedido, string> = {
  NOVO: "bg-primary/10 text-primary",
  AGUARDANDO_PAGAMENTO: "bg-warning/10 text-warning",
  PAGO: "bg-success/10 text-success",
  EM_PREPARACAO: "bg-warning/10 text-warning",
  ENVIADO: "bg-primary/10 text-primary",
  PRONTO_RETIRADA: "bg-primary/10 text-primary",
  ENTREGUE: "bg-success/10 text-success",
  CANCELADO: "bg-destructive/10 text-destructive",
};

export function PedidoStatusBadge({ status }: { status: StatusPedido }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", classNamePorStatus[status])}>
      {STATUS_PEDIDO_LABEL[status]}
    </Badge>
  );
}
