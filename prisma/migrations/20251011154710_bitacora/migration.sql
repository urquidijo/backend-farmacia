-- CreateEnum
CREATE TYPE "public"."EstadoBitacora" AS ENUM ('EXITOSO', 'FALLIDO');

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

-- CreateIndex
CREATE INDEX "bitacora_userId_createdAt_idx" ON "public"."bitacora"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "bitacora_estado_createdAt_idx" ON "public"."bitacora"("estado", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."bitacora" ADD CONSTRAINT "bitacora_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
