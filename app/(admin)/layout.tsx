import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? await prisma.usuario.findUnique({
        where: { supabaseId: user.id },
        select: { papelAdmin: true },
      })
    : null;

  if (!usuario?.papelAdmin) {
    redirect("/painel");
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="bg-sidebar text-sidebar-foreground flex w-64 flex-col border-r">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <span className="bg-sidebar-primary size-6 rounded-md" />
          <span className="font-semibold">Admin da plataforma</span>
        </div>
        <nav className="text-muted-foreground flex-1 px-3 py-4 text-sm">
          <AdminNav />
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-sm font-medium">Dono da plataforma</span>
          <LogoutButton />
        </header>
        {children}
      </div>
    </div>
  );
}
