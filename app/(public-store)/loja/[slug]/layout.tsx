"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { CartProvider } from "@/components/store/cart-context";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartSheet } from "@/components/store/cart-sheet";
import { WhatsappFloatButton } from "@/components/store/whatsapp-float-button";
import { trpc } from "@/lib/trpc/client";

export default function PublicStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  // Escopo por tenant: cada loja é resolvida pelo slug da rota via tRPC
  // público, nunca por um valor fixo.
  const { data: config, isLoading, isError } = trpc.lojaPublica.porSlug.useQuery({ slug });

  if (isError) notFound();
  if (isLoading || !config) return null;

  return (
    <CartProvider slug={slug}>
      <div
        className="flex min-h-full flex-1 flex-col"
        style={{ "--loja-primary": config.corPrimaria || "var(--primary)" } as React.CSSProperties}
      >
        <SiteHeader slug={slug} config={config} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter config={config} />
      </div>
      <CartSheet slug={slug} />
      <WhatsappFloatButton config={config} />
    </CartProvider>
  );
}
