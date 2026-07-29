import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-64 flex-col border-r bg-neutral-900 text-neutral-100">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-6 py-4">
          <span className="size-6 rounded-md bg-neutral-100" />
          <span className="font-semibold">Admin da plataforma</span>
        </div>
        <nav className="flex-1 px-3 py-4 text-sm">
          <AdminNav />
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-neutral-950 px-6 py-4 text-neutral-100">
          <span className="text-sm font-medium">Dono da plataforma</span>
          <div className="size-8 rounded-full bg-neutral-800" />
        </header>
        {children}
      </div>
    </div>
  );
}
