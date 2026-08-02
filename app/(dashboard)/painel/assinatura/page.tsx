"use client";

import { Suspense } from "react";
import { AssinaturaForm } from "@/components/dashboard/assinatura-form";

export default function AssinaturaPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie o plano da sua loja na plataforma.
        </p>
      </div>

      <Suspense>
        <AssinaturaForm />
      </Suspense>
    </div>
  );
}
