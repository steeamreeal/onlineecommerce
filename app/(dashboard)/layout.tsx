import { PainelNav } from "@/components/dashboard/painel-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificacoesSino } from "@/components/dashboard/notificacoes-sino";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="bg-sidebar text-sidebar-foreground flex w-64 flex-col border-r">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <span className="bg-sidebar-primary size-6 rounded-md" />
          <span className="font-semibold">Painel da loja</span>
        </div>
        <nav className="text-muted-foreground flex-1 px-3 py-4 text-sm">
          <PainelNav />
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-sm font-medium">Minha Loja</span>
          <div className="flex items-center gap-2">
            <NotificacoesSino />
            <LogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
