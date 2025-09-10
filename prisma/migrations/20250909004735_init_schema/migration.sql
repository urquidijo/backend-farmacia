-- CreateEnum
CREATE TYPE "public"."tipo_movimiento_enum" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "public"."bodegas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,

    CONSTRAINT "bodegas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "padre_id" INTEGER,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lotes" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "codigo_lote" TEXT NOT NULL,
    "fecha_fab" DATE,
    "fecha_ven" DATE,
    "costo_unit" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marcas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "tipo" "public"."tipo_movimiento_enum" NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "lote_id" INTEGER,
    "bodega_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "costo_unit" DECIMAL(14,4),
    "motivo" TEXT,
    "ref_tipo" TEXT,
    "ref_id" TEXT,
    "creado_por" INTEGER,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."productos" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria_id" INTEGER,
    "marca_id" INTEGER,
    "unidad_id" INTEGER NOT NULL,
    "stock_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "direccion" TEXT,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permisos" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "detalle" TEXT,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles_permisos" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "public"."unidades" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "clave_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios_roles" (
    "usuario_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("usuario_id","rol_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bodegas_codigo_key" ON "public"."bodegas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_producto_id_codigo_lote_key" ON "public"."lotes"("producto_id", "codigo_lote");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "public"."marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "public"."productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "public"."roles"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_clave_key" ON "public"."permisos"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_codigo_key" ON "public"."unidades"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "public"."usuarios"("correo");

-- AddForeignKey
ALTER TABLE "public"."categorias" ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "public"."categorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "public"."bodegas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."productos" ADD CONSTRAINT "productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."productos" ADD CONSTRAINT "productos_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
