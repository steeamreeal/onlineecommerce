-- CreateEnum
CREATE TYPE "TipoMidiaProduto" AS ENUM ('IMAGEM', 'VIDEO');

-- AlterTable
ALTER TABLE "FotoProduto" ADD COLUMN     "tipo" "TipoMidiaProduto" NOT NULL DEFAULT 'IMAGEM';
