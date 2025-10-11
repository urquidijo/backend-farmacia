import { PrismaClient, AlertSeverity, AlertType } from '@prisma/client';
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
    { key: 'alert.read', description: 'Ver alertas de stock y vencimiento' },
    { key: 'alert.manage', description: 'Gestionar alertas (marcar leidas)' },
    // Órdenes
    { key: 'order.read', description: 'Ver órdenes' },
    { key: 'order.manage', description: 'Gestionar órdenes' },
    // Clientes
    { key: 'cliente.read', description: 'Ver clientes' },
    { key: 'cliente.create', description: 'Crear clientes' },
    { key: 'cliente.update', description: 'Actualizar clientes' },
    { key: 'cliente.delete', description: 'Eliminar clientes' },
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
    'alert.read',
    'cliente.read',
    'cliente.create',
    'cliente.update',
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

  const demoMarca = await prisma.marca.upsert({
    where: { nombre: 'DemoLabs' },
    create: { nombre: 'DemoLabs' },
    update: {},
  });

  const demoCategoria = await prisma.categoria.upsert({
    where: { nombre: 'Analgesicos' },
    create: { nombre: 'Analgesicos' },
    update: {},
  });

  const demoUnidad = await prisma.unidad.upsert({
    where: { codigo: 'UNI' },
    create: { codigo: 'UNI', nombre: 'Unidades' },
    update: {},
  });

  let prodA = await prisma.producto.findFirst({ where: { nombre: 'Analgesico Demo A' } });
  if (prodA) {
    prodA = await prisma.producto.update({
      where: { id: prodA.id },
      data: { stockMinimo: 10, stockActual: 5 },
    });
  } else {
    prodA = await prisma.producto.create({
      data: {
        nombre: 'Analgesico Demo A',
        descripcion: 'Producto demo con stock bajo para disparar alertas.',
        precio: 12,
        stockMinimo: 10,
        stockActual: 5,
        marcaId: demoMarca.id,
        categoriaId: demoCategoria.id,
        unidadId: demoUnidad.id,
      },
    });
  }

  let prodB = await prisma.producto.findFirst({ where: { nombre: 'Suplemento Demo B' } });
  if (prodB) {
    prodB = await prisma.producto.update({
      where: { id: prodB.id },
      data: { stockActual: 30, stockMinimo: 15 },
    });
  } else {
    prodB = await prisma.producto.create({
      data: {
        nombre: 'Suplemento Demo B',
        descripcion: 'Producto demo con un lote proximo a vencer.',
        precio: 25,
        stockMinimo: 15,
        stockActual: 30,
        marcaId: demoMarca.id,
        categoriaId: demoCategoria.id,
        unidadId: demoUnidad.id,
      },
    });
  }

  let prodC = await prisma.producto.findFirst({ where: { nombre: 'Vitaminas Demo C' } });
  if (prodC) {
    prodC = await prisma.producto.update({
      where: { id: prodC.id },
      data: { stockActual: 40, stockMinimo: 8 },
    });
  } else {
    prodC = await prisma.producto.create({
      data: {
        nombre: 'Vitaminas Demo C',
        descripcion: 'Producto demo sin alertas activas.',
        precio: 18,
        stockMinimo: 8,
        stockActual: 40,
        marcaId: demoMarca.id,
        categoriaId: demoCategoria.id,
        unidadId: demoUnidad.id,
      },
    });
  }

  let loteB = await prisma.lote.findFirst({ where: { codigo: 'LOTE-DEMO-001' } });
  const vencimiento = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  if (loteB) {
    loteB = await prisma.lote.update({
      where: { id: loteB.id },
      data: { productoId: prodB.id, cantidad: 20, fechaVenc: vencimiento },
    });
  } else {
    loteB = await prisma.lote.create({
      data: {
        productoId: prodB.id,
        codigo: 'LOTE-DEMO-001',
        cantidad: 20,
        fechaVenc: vencimiento,
      },
    });
  }

  await prisma.alert.deleteMany();

  await prisma.alert.createMany({
    data: [
      {
        type: AlertType.STOCK_BAJO,
        productoId: prodA.id,
        mensaje: 'Stock por debajo del minimo (5 unidades).',
        severity: AlertSeverity.WARNING,
        stockActual: 5,
        stockMinimo: 10,
        windowDias: 30,
        leida: false,
      },
      {
        type: AlertType.VENCIMIENTO,
        productoId: prodB.id,
        loteId: loteB.id,
        mensaje: 'Lote vence en menos de 15 dias.',
        severity: AlertSeverity.WARNING,
        venceEnDias: 10,
        stockActual: prodB.stockActual,
        stockMinimo: prodB.stockMinimo,
        windowDias: 30,
        leida: false,
      },
    ],
  });
}

main().finally(() => prisma.$disconnect());
