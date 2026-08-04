-- CreateEnum
CREATE TYPE "TemplateLoja" AS ENUM ('MINIMALISTA', 'EDITORIAL', 'VITRINE');

-- AlterTable
ALTER TABLE "Loja" ADD COLUMN     "template" "TemplateLoja" NOT NULL DEFAULT 'MINIMALISTA';
