import Image from "next/image";
import { PainelNav } from "@/components/dashboard/painel-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificacoesSino } from "@/components/dashboard/notificacoes-sino";
import { AcessoLojaGuard } from "@/components/dashboard/acesso-loja-guard";
import { NomeLojaHeader } from "@/components/dashboard/nome-loja-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
            <NotificacoesSino />
            <LogoutButton />
          </div>
        </header>
        <AcessoLojaGuard>{children}</AcessoLojaGuard>
      </div>
    </div>
  );
}
