import { configuracaoLojaMock } from "@/lib/mocks/loja";

export function SiteFooter() {
  const config = configuracaoLojaMock;

  return (
    <footer className="mt-auto border-t px-6 py-8">
      <div className="grid gap-6 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{config.nome}</span>
          {config.endereco && <span className="text-muted-foreground">{config.endereco}</span>}
          {config.horarioAtend && (
            <span className="text-muted-foreground">{config.horarioAtend}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-medium">Contato</span>
          {config.whatsapp && (
            <span className="text-muted-foreground">WhatsApp: {config.whatsapp}</span>
          )}
          {config.instagram && (
            <span className="text-muted-foreground">Instagram: {config.instagram}</span>
          )}
        </div>
        {config.politicas && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Trocas e devoluções</span>
            <span className="text-muted-foreground">{config.politicas}</span>
          </div>
        )}
      </div>
    </footer>
  );
}
