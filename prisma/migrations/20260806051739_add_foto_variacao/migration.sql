-- AlterTable
ALTER TABLE "VariacaoProduto" ADD COLUMN     "fotoId" TEXT;

-- CreateIndex
CREATE INDEX "VariacaoProduto_fotoId_idx" ON "VariacaoProduto"("fotoId");

-- AddForeignKey
ALTER TABLE "VariacaoProduto" ADD CONSTRAINT "VariacaoProduto_fotoId_fkey" FOREIGN KEY ("fotoId") REFERENCES "FotoProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
