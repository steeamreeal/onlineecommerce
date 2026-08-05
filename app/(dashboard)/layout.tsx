import Image from "next/image";
import { PainelNav } from "@/components/dashboard/painel-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificacoesSino } from "@/components/dashboard/notificacoes-sino";
import { AcessoLojaGuard } from "@/components/dashboard/acesso-loja-guard";
import { NomeLojaHeader } from "@/components/dashboard/nome-loja-header";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { AparenciaMenu } from "@/components/aparencia-menu";
import { ThemeProvider } from "@/components/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Tema claro/escuro e cor de destaque são preferências do lojista só
    // dentro do PAINEL — por isso ThemeProvider/AccentColorProvider ficam
    // aqui (e em (admin)/layout.tsx), não no layout raiz. O site público
    // da loja (app/(public-store)) não deve herdar nada disso.
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AccentColorProvider>
        <div className="flex min-h-full flex-1">
          <aside className="bg-sidebar text-sidebar-foreground flex w-64 flex-col border-r">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Image src="/logo-zyron.png" alt="Zyron" width={24} height={24} />
              <span className="font-semibold">Painel da loja</span>
            </div>
            <nav className="text-muted-foreground flex-1 px-3 py-4 text-sm">
              <PainelNav />
            </nav>
          </aside>
          <div className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
              <NomeLojaHeader />
              <div className="flex items-center gap-2">
                <AparenciaMenu />
                <NotificacoesSino />
                <LogoutButton />
              </div>
            </header>
            <AcessoLojaGuard>{children}</AcessoLojaGuard>
          </div>
        </div>
      </AccentColorProvider>
    </ThemeProvider>
  );
}
