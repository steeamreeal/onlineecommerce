import Link from "next/link";
import { AtSign, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { ColunaRodape } from "@/lib/tema-loja";

type ConfiguracaoLoja = RouterOutputs["lojaPublica"]["porSlug"];

// Ícones puramente ilustrativos (bandeiras genéricas) — não amarrados a
// nenhuma configuração real de gateway. A forma de pagamento de fato
// aceita pela loja depende da conexão com o Mercado Pago (ver CLAUDE.md,
// seção Pagamentos M12), fora do escopo deste editor de tema.
const FORMAS_PAGAMENTO_ILUSTRATIVAS = ["Visa", "Mastercard", "Pix", "Boleto"];

function ColunaLinks({ coluna }: { coluna: ColunaRodape }) {
  if (coluna.links.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">{coluna.titulo}</span>
      {coluna.links.map((link) => (
        <Link key={link.id} href={link.url || "#"} className="text-muted-foreground hover:text-foreground">
          {link.texto}
        </Link>
      ))}
    </div>
  );
}

export function SiteFooter({
  config,
  mostrarRedesSociais = true,
  mostrarPoliticas = true,
  mostrarNewsletter = false,
  mostrarFormasPagamento = false,
  colunas = [],
}: {
  config: ConfiguracaoLoja;
  mostrarRedesSociais?: boolean;
  mostrarPoliticas?: boolean;
  mostrarNewsletter?: boolean;
  mostrarFormasPagamento?: boolean;
  colunas?: ColunaRodape[];
}) {
  return (
    <footer className="mt-auto border-t">
      {mostrarNewsletter && (
        <div className="border-b px-6 py-8">
          <div className="mx-auto flex max-w-md flex-col gap-3 text-center">
            <span className="font-medium">Receba novidades e ofertas exclusivas</span>
            <form className="flex gap-2">
              <Input type="email" placeholder="Seu e-mail" className="flex-1" />
              <Button type="submit">Cadastrar</Button>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6 px-6 py-8 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{config.nome}</span>
          {config.endereco && <span className="text-muted-foreground">{config.endereco}</span>}
          {config.horarioAtend && (
            <span className="text-muted-foreground">{config.horarioAtend}</span>
          )}
          {mostrarRedesSociais && (config.instagram || config.facebook) && (
            <div className="mt-2 flex items-center gap-3">
              {config.instagram && (
                <a
                  href={`https://instagram.com/${config.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <AtSign className="size-4" />
                </a>
              )}
              {config.facebook && (
                <a
                  href={config.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link2 className="size-4" />
                </a>
              )}
            </div>
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

        {mostrarPoliticas && config.politicas && (
          <div className="flex flex-col gap-1">
            <span className="font-medium">Trocas e devoluções</span>
            <span className="text-muted-foreground">{config.politicas}</span>
          </div>
        )}

        {colunas.map((coluna) => (
          <ColunaLinks key={coluna.id} coluna={coluna} />
        ))}
      </div>

      {mostrarFormasPagamento && (
        <div className="border-t px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {FORMAS_PAGAMENTO_ILUSTRATIVAS.map((forma) => (
              <span
                key={forma}
                className="text-muted-foreground rounded border px-2 py-1 text-xs font-medium"
              >
                {forma}
              </span>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
}
