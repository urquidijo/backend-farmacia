/*
  Warnings:

  - Added the required column `precio` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."productos" ADD COLUMN     "imagen_url" TEXT,
ADD COLUMN     "precio" DECIMAL(14,2) NOT NULL;
