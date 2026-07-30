/*
  Warnings:

  - Changed the type of `tipo` on the `MovimentoEstoque` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TipoMovimentoEstoque" AS ENUM ('ENTRADA', 'SAIDA');

-- AlterTable
ALTER TABLE "MovimentoEstoque" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoMovimentoEstoque" NOT NULL;

-- CreateIndex
CREATE INDEX "MovimentoEstoque_variacaoId_idx" ON "MovimentoEstoque"("variacaoId");
