// test/roles.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesModule } from '../src/roles/roles.module';

jest.setTimeout(30000);

describe('CU3: Gestionar Roles y Permisos (E2E – Caja negra)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;

  let roleId: number;
  let perm1Id: number;
  let perm2Id: number;

  const ROLE_NAME = 'E2E_ROLE_TEST';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, RolesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    httpServer = app.getHttpServer();
    prisma = app.get(PrismaService);

    // Limpieza previa por si el test ya se ejecutó antes
    await prisma.rolePermission.deleteMany({
      where: { role: { name: ROLE_NAME } },
    });
    await prisma.role.deleteMany({ where: { name: ROLE_NAME } });

    await prisma.permission.deleteMany({
      where: { key: { in: ['e2e.perm1', 'e2e.perm2'] } },
    });

    // Creamos permisos de prueba
    const perm1 = await prisma.permission.create({
      data: { key: 'e2e.perm1', description: 'Permiso E2E 1' },
    });
    const perm2 = await prisma.permission.create({
      data: { key: 'e2e.perm2', description: 'Permiso E2E 2' },
    });

    perm1Id = perm1.id;
    perm2Id = perm2.id;
  });

  afterAll(async () => {
    // Limpieza de datos de prueba
    await prisma.rolePermission.deleteMany({
      where: { role: { name: ROLE_NAME } },
    });
    await prisma.role.deleteMany({ where: { name: ROLE_NAME } });
    await prisma.permission.deleteMany({
      where: { key: { in: ['e2e.perm1', 'e2e.perm2'] } },
    });

    await app.close();
  });

  // -------------------------------------------------
  // 1. Listar roles
  // -------------------------------------------------
  it('Paso 1: debería listar roles', async () => {
    const res = await request(httpServer)
      .get('/roles')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  // -------------------------------------------------
  // 2. Crear rol
  // -------------------------------------------------
  it('Paso 2: debería crear un nuevo rol', async () => {
    const res = await request(httpServer)
      .post('/roles')
      .send({
        name: ROLE_NAME,
        description: 'Rol de pruebas E2E',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(ROLE_NAME);
    roleId = res.body.id;
  });

  // -------------------------------------------------
  // 3. Actualizar rol
  // -------------------------------------------------
  it('Paso 3: debería actualizar el rol creado', async () => {
    const res = await request(httpServer)
      .put(`/roles/${roleId}`)
      .send({
        name: ROLE_NAME,
        description: 'Rol de pruebas E2E (actualizado)',
      })
      .expect(200);

    expect(res.body.description).toContain('actualizado');
  });

  // -------------------------------------------------
  // 4. Ver detalles de un rol
  // -------------------------------------------------
  it('Paso 4: debería obtener el detalle del rol', async () => {
    const res = await request(httpServer)
      .get(`/roles/${roleId}`)
      .expect(200);

    expect(res.body.id).toBe(roleId);
    expect(res.body.name).toBe(ROLE_NAME);
    // inicialmente sin permisos
    expect(Array.isArray(res.body.permissions)).toBe(true);
  });

  // -------------------------------------------------
  // 5. Asignar permisos a un rol
  // -------------------------------------------------
  it('Paso 5: debería asignar permisos al rol', async () => {
    const res = await request(httpServer)
      .put(`/roles/${roleId}/permissions`)
      .send({
        permissionIds: [perm1Id, perm2Id],
      })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // -------------------------------------------------
  // 6. Consultar permisos del rol
  // -------------------------------------------------
  it('Paso 6: debería obtener los permisos asignados al rol', async () => {
    const res = await request(httpServer)
      .get(`/roles/${roleId}/permissions`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // -------------------------------------------------
  // 7. Eliminar rol
  // -------------------------------------------------
  it('Paso 7: debería eliminar el rol', async () => {
    await request(httpServer)
      .delete(`/roles/${roleId}`)
      .expect(200);

    // Opcional: llamado a findOne debería fallar con 404
    await request(httpServer)
      .get(`/roles/${roleId}`)
      .expect(404);
  });
});
