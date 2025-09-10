import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  const perms = [
    // Usuarios
    { key: 'user.read', description: 'Ver usuarios' },
    { key: 'user.create', description: 'Crear usuarios internos' },
    { key: 'user.update', description: 'Actualizar usuarios' },
    { key: 'user.delete', description: 'Eliminar usuarios' },
    // Inventario/Productos (ejemplos)
    { key: 'prod.read', description: 'Ver productos' },
    { key: 'prod.create', description: 'Crear/editar productos' },
    { key: 'inv.read', description: 'Ver inventario' },
    { key: 'inv.move', description: 'Movimientos de inventario/lotes' },
    // Órdenes
    { key: 'order.read', description: 'Ver órdenes' },
    { key: 'order.manage', description: 'Gestionar órdenes' },
  ];

  await prisma.permission.createMany({ data: perms, skipDuplicates: true });

  const [adminRole, vendedorRole, clienteRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      create: { name: 'ADMIN', description: 'Acceso total' },
      update: {},
    }),
    prisma.role.upsert({
      where: { name: 'VENDEDOR' },
      create: {
        name: 'VENDEDOR',
        description: 'Ventas, órdenes, inventario básico',
      },
      update: {},
    }),
    prisma.role.upsert({
      where: { name: 'CLIENTE' },
      create: { name: 'CLIENTE', description: 'Cliente e-commerce' },
      update: {},
    }),
  ]);

  // Asignar permisos a roles
  const allPerms = await prisma.permission.findMany();
  const get = (k: string) => allPerms.find((p) => p.key === k)!.id;

  const adminPerms = allPerms.map((p) => ({
    roleId: adminRole.id,
    permissionId: p.id,
  }));
  const vendedorPerms = [
    'prod.read',
    'order.read',
    'order.manage',
    'inv.read',
  ].map((k) => ({ roleId: vendedorRole.id, permissionId: get(k) }));
  const clientePerms = ['prod.read'].map((k) => ({
    roleId: clienteRole.id,
    permissionId: get(k),
  }));

  await prisma.rolePermission.createMany({
    data: adminPerms,
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: vendedorPerms,
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: clientePerms,
    skipDuplicates: true,
  });

  // Usuarios iniciales
  const adminPass = await bcrypt.hash('Admin123*', 10);
  const vendedorPass = await bcrypt.hash('Vendedor123*', 10);

  const [adminUser, vendedorUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@farmacia.com' },
      create: {
        email: 'admin@farmacia.com',
        firstName: 'Admin',
        lastName: 'Root',
        passwordHash: adminPass,
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { email: 'vendedor@farmacia.com' },
      create: {
        email: 'vendedor@farmacia.com',
        firstName: 'Vende',
        lastName: 'Dor',
        passwordHash: vendedorPass,
      },
      update: {},
    }),
  ]);

  await prisma.userRole.createMany({
    data: [
      { userId: adminUser.id, roleId: adminRole.id },
      { userId: vendedorUser.id, roleId: vendedorRole.id },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
