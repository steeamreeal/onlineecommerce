import { CartProvider } from "@/components/store/cart-context";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartSheet } from "@/components/store/cart-sheet";
import { WhatsappFloatButton } from "@/components/store/whatsapp-float-button";
import { configuracaoLojaMock } from "@/lib/mocks/loja";

export default function PublicStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A loja é resolvida via configuracaoLojaMock (mock único) até o backend real (M11)
  // trocar por consulta de ConfiguracaoLoja pelo slug da rota.
  const slug = configuracaoLojaMock.slug;

  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <SiteHeader slug={slug} />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </div>
      <CartSheet slug={slug} />
      <WhatsappFloatButton />
    </CartProvider>
  );
}
