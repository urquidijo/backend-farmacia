-- CreateEnum
CREATE TYPE "public"."EstadoOrdenCompra" AS ENUM ('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'RECIBIDA', 'CERRADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "public"."Lote" ADD COLUMN     "ordenCompraId" INTEGER;

-- CreateTable
CREATE TABLE "public"."OrdenCompra" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "estado" "public"."EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "totalEstimado" DECIMAL(65,30),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrdenCompraItem" (
    "id" SERIAL NOT NULL,
    "ordenCompraId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadSolic" INTEGER NOT NULL DEFAULT 0,
    "cantidadRecib" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(65,30),
    "subtotal" DECIMAL(65,30),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "public"."OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "OrdenCompra_estado_fechaCreacion_idx" ON "public"."OrdenCompra"("estado", "fechaCreacion");

-- CreateIndex
CREATE INDEX "OrdenCompraItem_ordenCompraId_idx" ON "public"."OrdenCompraItem"("ordenCompraId");

-- CreateIndex
CREATE INDEX "OrdenCompraItem_productoId_idx" ON "public"."OrdenCompraItem"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompraItem_ordenCompraId_productoId_key" ON "public"."OrdenCompraItem"("ordenCompraId", "productoId");

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "public"."OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "public"."OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
