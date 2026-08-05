import { baseUrl } from "@/lib/base-url";

// Cores extraídas de app/globals.css (--primary, --background, etc. em
// oklch) e convertidas para hex — clientes de e-mail (Gmail, Outlook) não
// suportam oklch nem variáveis CSS, só cores literais inline.
const CORES = {
  primary: "#a45c31",
  primaryForeground: "#fef8f2",
  background: "#fef7f0",
  card: "#fffdf9",
  foreground: "#221812",
  mutedForeground: "#6d6059",
  border: "#e7dcd2",
  success: "#368f4e",
  destructive: "#dc2626",
  warning: "#e8a127",
} as const;

// Layout de e-mail em tabelas (não flexbox/grid) — é o único subset de
// HTML/CSS que renderiza de forma consistente entre Gmail, Outlook e
// clientes móveis. Todo estilo é inline por causa disso também.
export function layoutEmail(params: { tituloSecao: string; conteudo: string; corAcento?: string }) {
  const acento = params.corAcento ?? CORES.primary;
  const logoUrl = `${baseUrl()}/logo-zyron.png`;

  return `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:${CORES.background};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CORES.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${CORES.card};border:1px solid ${CORES.border};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px;text-align:center;">
                <img src="${logoUrl}" width="32" height="32" alt="" style="display:inline-block;vertical-align:middle;" />
                <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:16px;font-weight:600;color:${CORES.foreground};">
                  Online E-commerce
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <hr style="border:none;border-top:1px solid ${CORES.border};margin:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${acento};">
                  ${params.tituloSecao}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;font-size:14px;line-height:1.6;color:${CORES.foreground};">
                ${params.conteudo}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:${CORES.background};border-top:1px solid ${CORES.border};text-align:center;">
                <p style="margin:0;font-size:12px;color:${CORES.mutedForeground};">
                  Este é um e-mail automático — não é necessário responder.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

export function botaoEmail(params: { texto: string; url?: string; cor?: string }) {
  if (!params.url) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="border-radius:8px;background-color:${params.cor ?? CORES.primary};">
          <a href="${params.url}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${CORES.primaryForeground};text-decoration:none;">
            ${params.texto}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export { CORES };
