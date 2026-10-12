-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "criadoPorId" TEXT;

-- CreateIndex
CREATE INDEX "Pedido_lojaId_criadoPorId_idx" ON "Pedido"("lojaId", "criadoPorId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
