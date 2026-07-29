"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const itens = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/produtos", label: "Produtos", icon: Package },
  // Pedidos, Clientes, Cupons, Frete, Configurações — milestone M4
];

export function PainelNav() {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => {
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
