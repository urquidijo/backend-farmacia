-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('STOCK_BAJO', 'VENCIMIENTO');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "public"."Producto" ADD COLUMN     "stockActual" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Lote" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "codigo" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "fechaVenc" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" SERIAL NOT NULL,
    "type" "public"."AlertType" NOT NULL,
    "productoId" INTEGER NOT NULL,
    "loteId" INTEGER,
    "mensaje" TEXT NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL,
    "venceEnDias" INTEGER,
    "stockActual" INTEGER,
    "stockMinimo" INTEGER,
    "windowDias" INTEGER NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lote_productoId_idx" ON "public"."Lote"("productoId");

-- CreateIndex
CREATE INDEX "Lote_fechaVenc_idx" ON "public"."Lote"("fechaVenc");

-- CreateIndex
CREATE INDEX "Alert_type_leida_idx" ON "public"."Alert"("type", "leida");

-- CreateIndex
CREATE INDEX "Alert_productoId_idx" ON "public"."Alert"("productoId");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "public"."Alert"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
