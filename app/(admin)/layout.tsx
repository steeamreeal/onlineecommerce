import Image from "next/image";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/client";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { AparenciaMenu } from "@/components/aparencia-menu";
import { ThemeProvider } from "@/components/theme-provider";

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
    // Tema claro/escuro e cor de destaque são preferências de quem usa o
    // painel admin — ver o mesmo comentário em (dashboard)/layout.tsx.
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AccentColorProvider>
        <div className="flex min-h-full flex-1">
          <aside className="bg-sidebar text-sidebar-foreground flex w-64 flex-col border-r">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Image src="/logo-zyron.png" alt="Zyron" width={24} height={24} />
              <span className="font-semibold">Admin da plataforma</span>
            </div>
            <nav className="text-muted-foreground flex-1 px-3 py-4 text-sm">
              <AdminNav />
            </nav>
          </aside>
          <div className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
              <span className="text-sm font-medium">Dono da plataforma</span>
              <div className="flex items-center gap-2">
                <AparenciaMenu />
                <LogoutButton />
              </div>
            </header>
            {children}
          </div>
        </div>
      </AccentColorProvider>
    </ThemeProvider>
  );
}
