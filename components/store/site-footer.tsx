"use client";

import Link from "next/link";
import { AtSign, Link2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import type { ColunaRodape } from "@/lib/tema-loja";

type ConfiguracaoLoja = RouterOutputs["lojaPublica"]["porSlug"];

// Ícones estilizados (simplificados, não os logotipos oficiais das
// bandeiras) — só ilustrativos, ver aviso mostrado ao lojista em
// painel-propriedades.tsx. A forma de pagamento de fato aceita pela loja
// depende da conexão com o Mercado Pago (ver CLAUDE.md, seção Pagamentos
// M12), fora do escopo deste editor de tema.
function IconeVisa() {
  return (
    <span className="flex h-6 w-10 items-center justify-center rounded border bg-white text-[10px] font-bold text-[#1A1F71]">
      VISA
    </span>
  );
}

function IconeMastercard() {
  return (
    <span className="flex h-6 w-10 items-center justify-center gap-0 rounded border bg-white">
      <span className="size-3.5 rounded-full bg-[#EB001B] opacity-90" />
      <span className="-ml-1.5 size-3.5 rounded-full bg-[#F79E1B] opacity-90" />
    </span>
  );
}

function IconeElo() {
  return (
    <span className="flex h-6 w-10 items-center justify-center rounded border bg-white text-[9px] font-bold text-[#000]">
      elo
    </span>
  );
}

function IconePix() {
  return (
    <span className="flex h-6 w-10 items-center justify-center rounded border bg-white text-[10px] font-bold text-[#32BCAD]">
      Pix
    </span>
  );
}

function IconeBoleto() {
  return (
    <span className="flex h-6 w-10 items-center justify-center gap-px rounded border bg-white px-1">
      {[2, 1, 2, 1, 1, 2, 1, 2, 1].map((w, i) => (
        <span key={i} className="bg-foreground h-3.5" style={{ width: w }} />
      ))}
    </span>
  );
}

const ICONES_PAGAMENTO = [
  { nome: "Visa", Icone: IconeVisa },
  { nome: "Mastercard", Icone: IconeMastercard },
  { nome: "Elo", Icone: IconeElo },
  { nome: "Pix", Icone: IconePix },
  { nome: "Boleto", Icone: IconeBoleto },
];

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

function ColunaInstitucional({ slug }: { slug: string }) {
  const { data: paginas = [] } = trpc.lojaPublica.paginasInstitucionais.useQuery({ slug });
  if (paginas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">Institucional</span>
      {paginas.map((pagina) => (
        <Link
          key={pagina.slug}
          href={`/loja/${slug}/pagina/${pagina.slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {pagina.titulo}
        </Link>
      ))}
    </div>
  );
}

function ColunaSac({ whatsapp, telefoneSac }: { whatsapp?: string | null; telefoneSac?: string | null }) {
  if (!whatsapp && !telefoneSac) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">SAC</span>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <MessageCircle className="size-3.5" />
          {whatsapp}
        </a>
      )}
      {telefoneSac && (
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Phone className="size-3.5" />
          {telefoneSac}
        </span>
      )}
    </div>
  );
}

export function SiteFooter({
  slug,
  config,
  mostrarRedesSociais = true,
  mostrarPoliticas = true,
  mostrarNewsletter = false,
  mostrarFormasPagamento = false,
  mostrarPaginasInstitucionais = false,
  mostrarSac = false,
  colunas = [],
}: {
  slug: string;
  config: ConfiguracaoLoja;
  mostrarRedesSociais?: boolean;
  mostrarPoliticas?: boolean;
  mostrarNewsletter?: boolean;
  mostrarFormasPagamento?: boolean;
  mostrarPaginasInstitucionais?: boolean;
  mostrarSac?: boolean;
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

        {mostrarPaginasInstitucionais && <ColunaInstitucional slug={slug} />}
        {mostrarSac && <ColunaSac whatsapp={config.whatsapp} telefoneSac={config.telefoneSac} />}

        {colunas.map((coluna) => (
          <ColunaLinks key={coluna.id} coluna={coluna} />
        ))}
      </div>

      {mostrarFormasPagamento && (
        <div className="border-t px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {ICONES_PAGAMENTO.map(({ nome, Icone }) => (
              <span key={nome} title={nome}>
                <Icone />
              </span>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
}
