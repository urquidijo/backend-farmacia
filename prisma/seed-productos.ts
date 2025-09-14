import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedProductos() {
  console.log('Seeding productos data...')

  // Crear marcas
  const marcas = await Promise.all([
    prisma.marca.upsert({
      where: { nombre: 'Bayer' },
      update: {},
      create: { nombre: 'Bayer' },
    }),
    prisma.marca.upsert({
      where: { nombre: 'Pfizer' },
      update: {},
      create: { nombre: 'Pfizer' },
    }),
    prisma.marca.upsert({
      where: { nombre: 'Roche' },
      update: {},
      create: { nombre: 'Roche' },
    }),
  ])

  // Crear categorías
  const categorias = await Promise.all([
    prisma.categoria.upsert({
      where: { nombre: 'Analgésicos' },
      update: {},
      create: { nombre: 'Analgésicos' },
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Antibióticos' },
      update: {},
      create: { nombre: 'Antibióticos' },
    }),
    prisma.categoria.upsert({
      where: { nombre: 'Vitaminas' },
      update: {},
      create: { nombre: 'Vitaminas' },
    }),
  ])

  // Crear unidades
  const unidades = await Promise.all([
    prisma.unidad.upsert({
      where: { codigo: 'TAB' },
      update: {},
      create: { codigo: 'TAB', nombre: 'Tabletas' },
    }),
    prisma.unidad.upsert({
      where: { codigo: 'CAP' },
      update: {},
      create: { codigo: 'CAP', nombre: 'Cápsulas' },
    }),
    prisma.unidad.upsert({
      where: { codigo: 'ML' },
      update: {},
      create: { codigo: 'ML', nombre: 'Mililitros' },
    }),
  ])

  // Crear productos de ejemplo
  await Promise.all([
    prisma.producto.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nombre: 'Aspirina 500mg',
        descripcion: 'Analgésico y antipirético',
        stockMinimo: 50,
        activo: true,
        marcaId: marcas[0].id,
        categoriaId: categorias[0].id,
        unidadId: unidades[0].id,
      },
    }),
    prisma.producto.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nombre: 'Amoxicilina 250mg',
        descripcion: 'Antibiótico de amplio espectro',
        stockMinimo: 30,
        activo: true,
        marcaId: marcas[1].id,
        categoriaId: categorias[1].id,
        unidadId: unidades[1].id,
      },
    }),
  ])

  console.log('Productos data seeded successfully!')
}

seedProductos()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })