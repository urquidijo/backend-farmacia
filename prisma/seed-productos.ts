import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Crear marcas
  const marcas = await Promise.all([
    prisma.marca.upsert({
      where: { nombre: "Genfar" },
      update: {},
      create: { nombre: "Genfar" },
    }),
    prisma.marca.upsert({
      where: { nombre: "Bagó" },
      update: {},
      create: { nombre: "Bagó" },
    }),
    prisma.marca.upsert({
      where: { nombre: "Isdin" },
      update: {},
      create: { nombre: "Isdin" },
    }),
    prisma.marca.upsert({
      where: { nombre: "Huggies" },
      update: {},
      create: { nombre: "Huggies" },
    }),
  ])

  // Crear categorías
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { nombre: "Analgésicos" },
      update: {},
      create: { nombre: "Analgésicos" },
    }),
    prisma.categoria.upsert({
      where: { nombre: "Dermocosmética" },
      update: {},
      create: { nombre: "Dermocosmética" },
    }),
    prisma.categoria.upsert({
      where: { nombre: "Bebés" },
      update: {},
      create: { nombre: "Bebés" },
    }),
    prisma.categoria.upsert({
      where: { nombre: "Vitaminas" },
      update: {},
      create: { nombre: "Vitaminas" },
    }),
  ])

  // Crear unidades
  const unidades = await Promise.all([
    prisma.unidad.upsert({
      where: { codigo: "COMP" },
      update: {},
      create: { codigo: "COMP", nombre: "Comprimidos" },
    }),
    prisma.unidad.upsert({
      where: { codigo: "ML" },
      update: {},
      create: { codigo: "ML", nombre: "Mililitros" },
    }),
    prisma.unidad.upsert({
      where: { codigo: "UNI" },
      update: {},
      create: { codigo: "UNI", nombre: "Unidades" },
    }),
    prisma.unidad.upsert({
      where: { codigo: "GR" },
      update: {},
      create: { codigo: "GR", nombre: "Gramos" },
    }),
  ])

  // Crear productos de ejemplo
  const productos = [
    {
      nombre: "Paracetamol 500mg x10",
      descripcion: "Analgésico y antipirético para el alivio del dolor y la fiebre",
      stockMinimo: 20,
      marcaId: marcas[0].id, // Genfar
      categoriaId: categorias[0].id, // Analgésicos
      unidadId: unidades[0].id, // Comprimidos
    },
    {
      nombre: "Ibuprofeno 400mg x10",
      descripcion: "Antiinflamatorio no esteroideo para dolor e inflamación",
      stockMinimo: 15,
      marcaId: marcas[1].id, // Bagó
      categoriaId: categorias[0].id, // Analgésicos
      unidadId: unidades[0].id, // Comprimidos
    },
    {
      nombre: "Protector Solar FPS50 50ml",
      descripcion: "Protección solar de amplio espectro, resistente al agua",
      stockMinimo: 10,
      marcaId: marcas[2].id, // Isdin
      categoriaId: categorias[1].id, // Dermocosmética
      unidadId: unidades[1].id, // Mililitros
    },
    {
      nombre: "Pañales M x36",
      descripcion: "Pañales ultra absorbentes para bebés de 6-10kg",
      stockMinimo: 5,
      marcaId: marcas[3].id, // Huggies
      categoriaId: categorias[2].id, // Bebés
      unidadId: unidades[2].id, // Unidades
    },
    {
      nombre: "Crema Hidratante Facial 50ml",
      descripcion: "Crema hidratante para rostro con ácido hialurónico",
      stockMinimo: 8,
      marcaId: marcas[2].id, // Isdin
      categoriaId: categorias[1].id, // Dermocosmética
      unidadId: unidades[1].id, // Mililitros
    },
    {
      nombre: "Vitamina C 1000mg x30",
      descripcion: "Suplemento de vitamina C para fortalecer el sistema inmune",
      stockMinimo: 12,
      marcaId: marcas[0].id, // Genfar
      categoriaId: categorias[3].id, // Vitaminas
      unidadId: unidades[0].id, // Comprimidos
    },
  ]

  // Verificar si ya existen productos
  const existingProducts = await prisma.producto.count()

  if (existingProducts === 0) {
    await prisma.producto.createMany({
      data: productos,
    })
  }

  console.log("Datos de prueba creados exitosamente")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
