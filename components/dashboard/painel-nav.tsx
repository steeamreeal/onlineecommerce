"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Paintbrush,
  ShoppingCart,
  Settings,
  Tag,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import type { PapelUsuario } from "@prisma/client";

const TODOS: PapelUsuario[] = ["DONO", "ADMINISTRADOR", "GERENTE", "VENDEDOR", "ESTOQUISTA", "SEPARADOR"];
const GESTAO: PapelUsuario[] = ["DONO", "ADMINISTRADOR", "GERENTE"];

// Só atalhos: a regra de verdade está no servidor (roleProcedure). O menu
// apenas deixa de oferecer o que o papel receberia como "sem permissão".
const itens: { href: string; label: string; icon: typeof Package; papeis: PapelUsuario[] }[] = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard, papeis: TODOS },
  { href: "/painel/produtos", label: "Produtos", icon: Package, papeis: [...GESTAO, "VENDEDOR", "ESTOQUISTA"] },
  { href: "/painel/categorias", label: "Categorias", icon: Tags, papeis: [...GESTAO, "ESTOQUISTA"] },
  { href: "/painel/pedidos", label: "Pedidos", icon: ShoppingCart, papeis: [...GESTAO, "VENDEDOR", "SEPARADOR"] },
  { href: "/painel/clientes", label: "Clientes", icon: Users, papeis: GESTAO },
  { href: "/painel/cupons", label: "Cupons", icon: Tag, papeis: [...GESTAO, "VENDEDOR"] },
  { href: "/painel/frete", label: "Frete", icon: Truck, papeis: GESTAO },
  { href: "/painel/aprovacoes", label: "Aprovações", icon: CheckCircle2, papeis: TODOS },
  { href: "/painel/paginas-institucionais", label: "Páginas institucionais", icon: FileText, papeis: ["DONO", "ADMINISTRADOR"] },
  { href: "/painel/tema", label: "Tema", icon: Paintbrush, papeis: GESTAO },
  { href: "/painel/assinatura", label: "Assinatura", icon: CreditCard, papeis: ["DONO", "ADMINISTRADOR"] },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings, papeis: GESTAO },
];

export function PainelNav() {
  const pathname = usePathname();
  const { data } = trpc.minhasLojas.listar.useQuery();
  const papel = data?.lojas.find((loja) => loja.id === data.ativaId)?.papel;
  // Enquanto o papel não carrega, mostra o menu completo (evita "pisca").
  const visiveis = papel ? itens.filter((item) => item.papeis.includes(papel)) : itens;

  return (
    <ul className="flex flex-col gap-1">
      {visiveis.map((item) => {
        const ativo =
          item.href === "/painel"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                ativo
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
