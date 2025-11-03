-- CreateEnum
CREATE TYPE "public"."Platform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- AlterTable
ALTER TABLE "public"."Producto" ADD COLUMN     "proveedorId" INTEGER;

-- CreateTable
CREATE TABLE "public"."DeviceToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "public"."Platform" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "public"."DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "public"."DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_active_idx" ON "public"."DeviceToken"("active");

-- CreateIndex
CREATE INDEX "Proveedor_nombre_idx" ON "public"."Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Proveedor_email_idx" ON "public"."Proveedor"("email");

-- CreateIndex
CREATE INDEX "Producto_proveedorId_idx" ON "public"."Producto"("proveedorId");

-- AddForeignKey
ALTER TABLE "public"."DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
