export default function PublicStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold">Nome da loja</span>
        <nav className="text-muted-foreground text-sm">
          {/* Itens de navegação da loja (categorias, busca, carrinho) — milestone M5 */}
        </nav>
      </header>
      {children}
    </div>
  );
}
