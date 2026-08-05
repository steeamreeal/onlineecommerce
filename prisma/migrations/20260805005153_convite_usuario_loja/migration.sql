-- CreateTable
CREATE TABLE "ConviteUsuarioLoja" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteUsuarioLoja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteUsuarioLoja_token_key" ON "ConviteUsuarioLoja"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ConviteUsuarioLoja_lojaId_email_key" ON "ConviteUsuarioLoja"("lojaId", "email");

-- AddForeignKey
ALTER TABLE "ConviteUsuarioLoja" ADD CONSTRAINT "ConviteUsuarioLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
