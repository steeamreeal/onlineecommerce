import { notFound } from "next/navigation";
import { CartProvider } from "@/components/store/cart-context";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartSheet } from "@/components/store/cart-sheet";
import { WhatsappFloatButton } from "@/components/store/whatsapp-float-button";
import { getConfiguracaoLojaPorSlug } from "@/lib/mocks/loja";

export default async function PublicStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Escopo por tenant: cada loja é resolvida pelo slug da rota, nunca por um
  // valor fixo. Mock hoje (getConfiguracaoLojaPorSlug), tRPC/Prisma no M11.
  const config = getConfiguracaoLojaPorSlug(slug);
  if (!config) notFound();

  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <SiteHeader slug={slug} config={config} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter config={config} />
      </div>
      <CartSheet slug={slug} />
      <WhatsappFloatButton config={config} />
    </CartProvider>
  );
}
