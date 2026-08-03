-- CreateEnum
CREATE TYPE "PapelAdmin" AS ENUM ('SUPER_ADMIN', 'SUPORTE', 'FINANCEIRO');

-- AlterTable
ALTER TABLE "Loja" ADD COLUMN     "emailContato" TEXT,
ADD COLUMN     "responsavel" TEXT;

-- AlterTable
ALTER TABLE "Plano" ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "papelAdmin" "PapelAdmin";
