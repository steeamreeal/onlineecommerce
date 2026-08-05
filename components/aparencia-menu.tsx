"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CORES_DESTAQUE, useAccentColor, type CorDestaque } from "@/components/accent-color-provider";
import { cn } from "@/lib/utils";

const TEMA_OPCOES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function AparenciaMenu() {
  const { theme, setTheme } = useTheme();
  const { cor, setCor } = useAccentColor();
  const [montado, setMontado] = useState(false);

  // Evita mismatch de hidratação: o tema real só é conhecido no client.
  useEffect(() => setMontado(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Aparência">
            {montado && theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          {TEMA_OPCOES.map((opcao) => (
            <DropdownMenuItem key={opcao.value} onClick={() => setTheme(opcao.value)}>
              <opcao.icon className="size-4" />
              {opcao.label}
              {montado && theme === opcao.value && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            <Palette className="size-3.5" />
            Cor de destaque
          </DropdownMenuLabel>
          <div className="flex items-center gap-2 px-2 py-1.5">
            {(Object.entries(CORES_DESTAQUE) as [CorDestaque, (typeof CORES_DESTAQUE)[CorDestaque]][]).map(
              ([valor, config]) => (
                <button
                  key={valor}
                  type="button"
                  aria-label={config.label}
                  title={config.label}
                  onClick={() => setCor(valor)}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition",
                    cor === valor && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: config.light }}
                >
                  {cor === valor && <Check className="size-3.5 text-white" />}
                </button>
              ),
            )}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
