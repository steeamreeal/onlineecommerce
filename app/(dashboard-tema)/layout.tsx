import { ThemeProvider } from "@/components/theme-provider";
import { AcessoLojaGuard } from "@/components/dashboard/acesso-loja-guard";
import { CLASSE_FONTES_TEMA } from "@/lib/fontes-tema";

// Layout deliberadamente sem PainelNav/header do painel — o editor de tema
// abre em nova aba (ver app/(dashboard)/painel/tema/page.tsx, botão "Abrir
// editor") como uma experiência de tela cheia focada só na edição, igual ao
// editor de tema da Shopify. A autenticação continua garantida pelo
// middleware (proxy.ts checa sessão por prefixo de path "/painel", não pelo
// route group), então não precisa reimplementar isso aqui.
export default function DashboardTemaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {/* display:contents — o preview do editor reaproveita o mesmo
          ThemeRenderer do site público (ver preview-tema.tsx), então
          precisa das mesmas CSS vars de fonte pra refletir a escolha de
          fonte do banner; contents evita virar mais um container na árvore
          flex de altura fixa do editor (ver EditorTema). */}
      <div className={`${CLASSE_FONTES_TEMA} contents`}>
        <AcessoLojaGuard>{children}</AcessoLojaGuard>
      </div>
    </ThemeProvider>
  );
}
