export type PapelUsuario =
  | "ADMINISTRADOR"
  | "GERENTE"
  | "VENDEDOR"
  | "ESTOQUISTA"
  | "SEPARADOR";

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

export type UsuarioLoja = {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  createdAt: string;
};

export const usuariosLojaMock: UsuarioLoja[] = [
  {
    id: "user-1",
    nome: "Leonardo Reis",
    email: "leonardo@creddfacil.com.br",
    papel: "ADMINISTRADOR",
    createdAt: "2026-01-05T09:00:00Z",
  },
  {
    id: "user-2",
    nome: "Patrícia Nunes",
    email: "patricia.nunes@email.com",
    papel: "GERENTE",
    createdAt: "2026-02-14T10:30:00Z",
  },
  {
    id: "user-3",
    nome: "Rafael Torres",
    email: "rafael.torres@email.com",
    papel: "VENDEDOR",
    createdAt: "2026-03-20T14:15:00Z",
  },
  {
    id: "user-4",
    nome: "Camila Freitas",
    email: "camila.freitas@email.com",
    papel: "ESTOQUISTA",
    createdAt: "2026-04-11T11:00:00Z",
  },
  {
    id: "user-5",
    nome: "Bruno Santos",
    email: "bruno.santos@email.com",
    papel: "SEPARADOR",
    createdAt: "2026-05-02T16:40:00Z",
  },
];
