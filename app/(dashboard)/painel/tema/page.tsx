import { ExternalLink, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TemaPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
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
        Abrir editor
        <ExternalLink />
      </Button>
    </div>
  );
}
