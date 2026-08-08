-- AlterTable
ALTER TABLE "Loja" ADD COLUMN "telefoneSac" TEXT;

-- CreateTable
CREATE TABLE "PaginaInstitucional" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaginaInstitucional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaginaInstitucional_lojaId_slug_key" ON "PaginaInstitucional"("lojaId", "slug");

-- AddForeignKey
ALTER TABLE "PaginaInstitucional" ADD CONSTRAINT "PaginaInstitucional_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
