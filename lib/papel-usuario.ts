import type { PapelUsuario } from "@prisma/client";

export const PAPEL_USUARIO_LABEL: Record<PapelUsuario, string> = {
  ADMINISTRADOR: "Administrador",
  GERENTE: "Gerente",
  VENDEDOR: "Vendedor",
  ESTOQUISTA: "Estoquista",
  SEPARADOR: "Separador de pedidos",
};

export const PAPEL_USUARIO_DESCRICAO: Record<PapelUsuario, string> = {
  ADMINISTRADOR: "Acesso total à loja, incluindo usuários e configurações",
  GERENTE: "Acesso operacional completo, exceto configurações sensíveis",
  VENDEDOR: "Gerencia pedidos e clientes",
  ESTOQUISTA: "Gerencia produtos e estoque",
  SEPARADOR: "Consulta e separa itens de pedidos",
};
