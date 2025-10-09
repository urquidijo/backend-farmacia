-- CreateEnum
CREATE TYPE "public"."EstadoOrden" AS ENUM ('PENDIENTE', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "public"."CarritoItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarritoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Orden" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "estado" "public"."EstadoOrden" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrdenItem" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "OrdenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarritoItem_userId_productoId_key" ON "public"."CarritoItem"("userId", "productoId");

-- AddForeignKey
ALTER TABLE "public"."CarritoItem" ADD CONSTRAINT "CarritoItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarritoItem" ADD CONSTRAINT "CarritoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Orden" ADD CONSTRAINT "Orden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenItem" ADD CONSTRAINT "OrdenItem_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "public"."Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenItem" ADD CONSTRAINT "OrdenItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
