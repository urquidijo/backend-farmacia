/*
  Warnings:

  - You are about to drop the `bodegas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categorias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lotes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marcas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `movimientos_inventario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permisos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `proveedores` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles_permisos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `unidades` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarios_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "public"."categorias" DROP CONSTRAINT "categorias_padre_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."lotes" DROP CONSTRAINT "lotes_producto_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_bodega_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_creado_por_fkey";

-- DropForeignKey
ALTER TABLE "public"."movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_lote_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_producto_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."productos" DROP CONSTRAINT "productos_categoria_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."productos" DROP CONSTRAINT "productos_marca_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."productos" DROP CONSTRAINT "productos_unidad_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."roles_permisos" DROP CONSTRAINT "roles_permisos_permiso_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."roles_permisos" DROP CONSTRAINT "roles_permisos_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."usuarios_roles" DROP CONSTRAINT "usuarios_roles_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."usuarios_roles" DROP CONSTRAINT "usuarios_roles_usuario_id_fkey";

-- DropTable
DROP TABLE "public"."bodegas";

-- DropTable
DROP TABLE "public"."categorias";

-- DropTable
DROP TABLE "public"."lotes";

-- DropTable
DROP TABLE "public"."marcas";

-- DropTable
DROP TABLE "public"."movimientos_inventario";

-- DropTable
DROP TABLE "public"."permisos";

-- DropTable
DROP TABLE "public"."productos";

-- DropTable
DROP TABLE "public"."proveedores";

-- DropTable
DROP TABLE "public"."roles";

-- DropTable
DROP TABLE "public"."roles_permisos";

-- DropTable
DROP TABLE "public"."unidades";

-- DropTable
DROP TABLE "public"."usuarios";

-- DropTable
DROP TABLE "public"."usuarios_roles";

-- DropEnum
DROP TYPE "public"."tipo_movimiento_enum";

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "public"."Permission"("key");

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
