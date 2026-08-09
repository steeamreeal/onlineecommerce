-- AlterEnum
ALTER TYPE "TipoSolicitacao" ADD VALUE 'ACESSO_EDITAR_TEMA';

-- AlterTable
ALTER TABLE "UsuarioLoja" ADD COLUMN     "podeEditarTema" BOOLEAN NOT NULL DEFAULT false;
