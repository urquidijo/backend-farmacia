-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."EstadoOrden" AS ENUM ('PENDIENTE', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('STOCK_BAJO', 'VENCIMIENTO');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."EstadoBitacora" AS ENUM ('EXITOSO', 'FALLIDO');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "telefono" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "public"."Marca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unidad" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "unidadId" INTEGER NOT NULL,
    "imageKey" TEXT,
    "imageUrl" TEXT,
    "precio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "requiereReceta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "nit" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."bitacora" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "acciones" TEXT NOT NULL,
    "estado" "public"."EstadoBitacora" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pago" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "stripeId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "metodo" TEXT,
    "facturaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "public"."Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nombre_key" ON "public"."Marca"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "public"."Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_codigo_key" ON "public"."Unidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nit_key" ON "public"."Cliente"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "CarritoItem_userId_productoId_key" ON "public"."CarritoItem"("userId", "productoId");

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

-- CreateIndex
CREATE INDEX "bitacora_userId_createdAt_idx" ON "public"."bitacora"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "bitacora_estado_createdAt_idx" ON "public"."bitacora"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_ordenId_key" ON "public"."Pago"("ordenId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripeId_key" ON "public"."Pago"("stripeId");

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "public"."Marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Producto" ADD CONSTRAINT "Producto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "public"."Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarritoItem" ADD CONSTRAINT "CarritoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarritoItem" ADD CONSTRAINT "CarritoItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Orden" ADD CONSTRAINT "Orden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenItem" ADD CONSTRAINT "OrdenItem_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "public"."Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrdenItem" ADD CONSTRAINT "OrdenItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bitacora" ADD CONSTRAINT "bitacora_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pago" ADD CONSTRAINT "Pago_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "public"."Orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
