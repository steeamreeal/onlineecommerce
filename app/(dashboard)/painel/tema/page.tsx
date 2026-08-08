import { ExternalLink, Paintbrush, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TemaPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Paintbrush className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Editor de tema</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            Personalize as seções, cores e fontes da página inicial da sua loja num editor em tela
            cheia, com pré-visualização ao vivo.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<a href="/painel/tema/editar" target="_blank" rel="noopener noreferrer" />}
        >
          Abrir editor da página inicial
          <ExternalLink />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <PackageSearch className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Editor da página de produto</h1>
          <p className="text-muted-foreground max-w-sm text-sm">
            Personalize os blocos que aparecem na página de cada produto — a configuração vale para
            todos os produtos da loja de uma vez.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/painel/tema/produto/editar" target="_blank" rel="noopener noreferrer" />}
        >
          Abrir editor da página de produto
          <ExternalLink />
        </Button>
      </div>
    </div>
  );
}
