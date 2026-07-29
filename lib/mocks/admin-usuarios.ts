export type PapelAdmin = "SUPER_ADMIN" | "SUPORTE" | "FINANCEIRO";

export const PAPEL_ADMIN_LABEL: Record<PapelAdmin, string> = {
  SUPER_ADMIN: "Super admin",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
};

export const PAPEL_ADMIN_DESCRICAO: Record<PapelAdmin, string> = {
  SUPER_ADMIN: "Acesso total à plataforma, incluindo outros usuários admin",
  SUPORTE: "Consulta lojas e pode bloquear/liberar, sem acesso financeiro",
  FINANCEIRO: "Consulta planos, assinaturas e métricas de faturamento",
};

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  papel: PapelAdmin;
  createdAt: string;
};

export const usuariosAdminMock: UsuarioAdmin[] = [
  {
    id: "admin-1",
    nome: "Leonardo Reis",
    email: "leonardo@creddfacil.com.br",
    papel: "SUPER_ADMIN",
    createdAt: "2025-08-01T09:00:00Z",
  },
  {
    id: "admin-2",
    nome: "Juliana Prado",
    email: "juliana.prado@plataforma.com.br",
    papel: "SUPORTE",
    createdAt: "2025-10-14T09:00:00Z",
  },
  {
    id: "admin-3",
    nome: "Marcos Vinícius Alves",
    email: "marcos.alves@plataforma.com.br",
    papel: "FINANCEIRO",
    createdAt: "2026-02-02T09:00:00Z",
  },
];
