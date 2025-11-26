import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando permisos de analytics...')

  // 1. Crear permisos
  const analyticsRead = await prisma.permission.upsert({
    where: { key: 'analytics.read' },
    update: {},
    create: {
      key: 'analytics.read',
      description: 'Leer datos de analytics y pronósticos',
    },
  })
  console.log('✅ Permiso creado:', analyticsRead.key)

  const analyticsWrite = await prisma.permission.upsert({
    where: { key: 'analytics.write' },
    update: {},
    create: {
      key: 'analytics.write',
      description: 'Generar pronósticos y análisis RFM',
    },
  })
  console.log('✅ Permiso creado:', analyticsWrite.key)

  // 2. Buscar el rol "admin" o "Administrador"
  const adminRole = await prisma.role.findFirst({
    where: {
      OR: [
        { name: { contains: 'admin', mode: 'insensitive' } },
        { name: { contains: 'administrador', mode: 'insensitive' } },
      ],
    },
  })

  if (!adminRole) {
    console.log('⚠️  No se encontró un rol de administrador. Crea uno primero.')
    return
  }

  console.log('📋 Rol admin encontrado:', adminRole.name, `(ID: ${adminRole.id})`)

  // 3. Asignar permisos al rol admin
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: analyticsRead.id,
      },
    },
    update: {},
    create: {
      roleId: adminRole.id,
      permissionId: analyticsRead.id,
    },
  })
  console.log(`✅ Asignado ${analyticsRead.key} a ${adminRole.name}`)

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: analyticsWrite.id,
      },
    },
    update: {},
    create: {
      roleId: adminRole.id,
      permissionId: analyticsWrite.id,
    },
  })
  console.log(`✅ Asignado ${analyticsWrite.key} a ${adminRole.name}`)

  console.log('\n🎉 Seeding completado exitosamente!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error en seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
