-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "totalGastoAnterior" DECIMAL(10,2),
ADD COLUMN     "ultimaCompraAnterior" TIMESTAMP(3);
