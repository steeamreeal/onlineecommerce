// Integração com a Vercel Domains API — usada para cadastrar/remover
// automaticamente o domínio próprio de uma loja no projeto da plataforma na
// Vercel, sem precisar do admin entrar manualmente em Settings → Domains a
// cada cliente novo (ver Loja.dominioProprio em schema.prisma e M15 no
// CLAUDE.md). Token/projeto são da PLATAFORMA (uma conta só), nunca por loja.
//
// Docs: https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project

const VERCEL_API_BASE = "https://api.vercel.com";

function getConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || undefined };
}

function buildUrl(path: string, teamId: string | undefined) {
  const url = new URL(`${VERCEL_API_BASE}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

export class VercelDomainsIndisponivelError extends Error {
  constructor() {
    super(
      "Cadastro automático de domínio não está configurado nesta instalação (faltam VERCEL_API_TOKEN/VERCEL_PROJECT_ID).",
    );
    this.name = "VercelDomainsIndisponivelError";
  }
}

/**
 * Adiciona um domínio ao projeto da plataforma na Vercel. Idempotente na
 * prática: se o domínio já estiver no projeto, a Vercel responde 400 e essa
 * função trata como sucesso (nada a fazer). Lança erro descritivo para os
 * outros casos (400 domínio inválido, 409 domínio já usado por outro
 * projeto/conta) para a mutation do tRPC repassar ao lojista.
 */
export async function adicionarDominioNaVercel(dominio: string): Promise<void> {
  const config = getConfig();
  if (!config) throw new VercelDomainsIndisponivelError();

  const resposta = await fetch(
    buildUrl(`/v10/projects/${config.projectId}/domains`, config.teamId),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: dominio }),
    },
  );

  if (resposta.ok) return;

  const corpo = await resposta.json().catch(() => null);
  const codigo = corpo?.error?.code as string | undefined;
  const mensagem = corpo?.error?.message as string | undefined;

  // "domain_already_in_use" quando já está neste mesmo projeto — nada a
  // fazer, o domínio já está cadastrado como queríamos.
  if (resposta.status === 400 && codigo === "domain_already_in_use") return;

  if (resposta.status === 409) {
    throw new Error(
      "Este domínio já está associado a outro projeto na Vercel. Verifique se ele não está em uso em outra conta/projeto.",
    );
  }

  throw new Error(mensagem || `Não foi possível cadastrar o domínio na Vercel (status ${resposta.status}).`);
}

/**
 * Remove um domínio do projeto na Vercel. Chamado quando o lojista troca ou
 * apaga o domínio próprio salvo — evita acumular domínios órfãos vinculados
 * ao projeto. Tolerante a "já não existe" (404), não é erro real aqui.
 */
export async function removerDominioDaVercel(dominio: string): Promise<void> {
  const config = getConfig();
  if (!config) throw new VercelDomainsIndisponivelError();

  const resposta = await fetch(
    buildUrl(`/v9/projects/${config.projectId}/domains/${encodeURIComponent(dominio)}`, config.teamId),
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.token}` },
    },
  );

  if (resposta.ok || resposta.status === 404) return;

  const corpo = await resposta.json().catch(() => null);
  throw new Error(
    corpo?.error?.message || `Não foi possível remover o domínio da Vercel (status ${resposta.status}).`,
  );
}

export type StatusDominioVercel = {
  configurado: boolean;
  configuradoPor: "A" | "CNAME" | "http" | "dns-01" | null;
};

/**
 * Consulta se o DNS do domínio já está apontando corretamente para a
 * Vercel — usado pela tela de domínio próprio no painel para mostrar ao
 * lojista se falta só propagar ou se já está tudo certo, sem ele precisar
 * ficar testando no navegador.
 */
export async function statusDominioNaVercel(dominio: string): Promise<StatusDominioVercel> {
  const config = getConfig();
  if (!config) throw new VercelDomainsIndisponivelError();

  const resposta = await fetch(
    buildUrl(`/v6/domains/${encodeURIComponent(dominio)}/config`, config.teamId),
    { headers: { Authorization: `Bearer ${config.token}` } },
  );

  if (!resposta.ok) {
    throw new Error(`Não foi possível consultar o status do domínio na Vercel (status ${resposta.status}).`);
  }

  const corpo = await resposta.json();
  return {
    configurado: corpo.misconfigured === false,
    configuradoPor: corpo.configuredBy ?? null,
  };
}
