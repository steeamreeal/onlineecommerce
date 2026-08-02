-- CreateEnum
CREATE TYPE "OrigemWebhook" AS ENUM ('STRIPE', 'MERCADO_PAGO');

-- AlterTable
ALTER TABLE "Loja" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpUserId" TEXT,
ADD COLUMN     "mpConectadoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "linkPagamento" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "origem" "OrigemWebhook" NOT NULL,
    "eventoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Loja_stripeCustomerId_key" ON "Loja"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_stripeSubscriptionId_key" ON "Loja"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_mpAccessToken_key" ON "Loja"("mpAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_mpUserId_key" ON "Loja"("mpUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_mpPaymentId_key" ON "Pedido"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_origem_eventoId_key" ON "WebhookEvent"("origem", "eventoId");
