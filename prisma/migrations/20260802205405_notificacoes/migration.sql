-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('PEDIDO_NOVO', 'ESTOQUE_BAIXO', 'STATUS_ATUALIZADO');

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "pedidoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_lojaId_lida_idx" ON "Notificacao"("lojaId", "lida");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
