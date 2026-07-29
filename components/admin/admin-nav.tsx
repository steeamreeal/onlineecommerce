"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const itens = [
  { href: "/admin", label: "Métricas", icon: LayoutDashboard },
  { href: "/admin/lojas", label: "Lojas", icon: Store },
  { href: "/admin/planos", label: "Planos", icon: Tag },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => {
        const ativo =
          item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                ativo
                  ? "bg-neutral-800 font-medium text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100",
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
