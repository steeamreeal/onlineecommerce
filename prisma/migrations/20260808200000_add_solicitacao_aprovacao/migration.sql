-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "TipoSolicitacao" AS ENUM ('CLIENTE_CRIAR', 'CLIENTE_ATUALIZAR', 'CLIENTE_REMOVER', 'FRETE_CRIAR', 'FRETE_ATUALIZAR', 'FRETE_ALTERNAR_ATIVO', 'FRETE_REMOVER', 'ESTOQUE_MOVIMENTO', 'ESTOQUE_IMPORTAR', 'PRODUTO_CRIAR', 'PRODUTO_ATUALIZAR', 'PEDIDO_CRIAR', 'PEDIDO_ATUALIZAR_STATUS', 'PEDIDO_ATUALIZAR_RASTREIO');

-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "tipo" "TipoSolicitacao" NOT NULL,
    "resumo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "revisorId" TEXT,
    "revisadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Solicitacao_lojaId_status_idx" ON "Solicitacao"("lojaId", "status");

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
