"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./client";

// FORBIDDEN/UNAUTHORIZED (ex.: loja bloqueada pelo admin, sessão expirada) e
// BAD_REQUEST (ex.: login sem nenhuma loja vinculada) são permanentes para a
// requisição atual — re-tentar não muda o resultado e só atrasa a UI mostrar
// o estado de erro (ver AcessoLojaGuard), além de gerar tráfego à toa.
function deveRetentar(falhas: number, erro: unknown) {
  if (falhas >= 3) return false;
  if (erro instanceof TRPCClientError) {
    const code = erro.data?.code;
    if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || code === "BAD_REQUEST") return false;
  }
  return true;
}

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: deveRetentar } } }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
