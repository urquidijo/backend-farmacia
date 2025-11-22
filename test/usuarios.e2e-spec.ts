// test/usuarios.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { AuthModule } from '../src/auth/auth.module';
import { UsuariosModule } from '../src/usuarios/usuarios.module';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { AuthGuard } from '@nestjs/passport';

jest.setTimeout(30000);

// Necesitamos el mismo guard que usas en el controller
const JwtAuthGuard = AuthGuard('jwt');

describe('CU1: Gestionar Usuarios (E2E – Caja negra)', () => {
  let app: INestApplication;
  let httpServer: any;
  let createdUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule, UsuariosModule],
    })
      // Sobrescribimos los guards para NO exigir JWT ni permisos en los tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------
  // Paso 1 – Crear usuario nuevo (POST /users/internal)
  // -------------------------------------------------
  it('Paso 1: debería crear un nuevo usuario', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: 'e2euser@test.com',
        password: '123456',
        firstName: 'Test',
        lastName: 'User',
        telefono: '77777777',
        roleId: 1, // ajusta si tu rol CLIENTE/Admin es otro id
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('e2euser@test.com');
    createdUserId = res.body.id;
  });

  // ------------------------------------------------------------------
  // Paso 2 – Evitar correo duplicado (mismo email -> se espera error)
  // ------------------------------------------------------------------
  it('Paso 2: debería rechazar un correo duplicado', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: 'e2euser@test.com', // mismo email que el Paso 1
        password: '123456',
        firstName: 'Repetido',
        lastName: 'Error',
        telefono: '77777777',
        roleId: 1,
      });

    // Idealmente deberías manejar esto en el servicio y lanzar una excepción 400.
    // Si todavía no lo manejas, esta prueba va a fallar y te sirve como TODO de calidad.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // -------------------------------------------------
  // Paso 3 – Listar usuarios (GET /users)
  // -------------------------------------------------
  it('Paso 3: debería listar usuarios', async () => {
    const res = await request(httpServer).get('/users').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Opcional: verificar que esté el usuario creado
    const found = res.body.find((u: any) => u.email === 'e2euser@test.com');
    expect(found).toBeDefined();
  });

  // -------------------------------------------------
  // Paso 4 – Actualizar usuario (PATCH /users/:id)
  // -------------------------------------------------
  it('Paso 4: debería actualizar el usuario creado', async () => {
    const res = await request(httpServer)
      .patch(`/users/${createdUserId}`)
      .send({
        firstName: 'Actualizado',
        telefono: '70000000',
        // puedes cambiar roleId también si quieres probar cambio de rol
        roleId: 2,
      })
      .expect(200);

    expect(res.body.firstName).toBe('Actualizado');
    expect(res.body.telefono).toBe('70000000');
  });

  // -------------------------------------------------
  // Paso 5 – Eliminar usuario (DELETE /users/:id)
  // -------------------------------------------------
  it('Paso 5: debería eliminar el usuario', async () => {
    await request(httpServer)
      .delete(`/users/${createdUserId}`)
      .expect(200);
  });

  // -------------------------------------------------
  // Paso 6 – Listar clientes (GET /users/clientes)
  // -------------------------------------------------
  it('Paso 6: debería listar clientes (rol CLIENTE)', async () => {
    const res = await request(httpServer)
      .get('/users/clientes')
      .expect(200);

    // Puede ser array vacío si aún no tienes clientes creados,
    // lo importante es que la respuesta sea una lista.
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ----------------------------------------------------------------------
  // Paso 7 – Filtrar clientes por rango de fechas (GET /users/clientes/by-date-range)
  // ----------------------------------------------------------------------
  it('Paso 7: debería filtrar clientes por rango de fechas', async () => {
    const res = await request(httpServer)
      .get('/users/clientes/by-date-range')
      .query({
        fechaInicial: '2024-01-01',
        fechaFinal: '2025-12-31',
      })
      .expect(200);

    // Estructura que devuelve tu servicio:
    // { clientes: [...], total: number, fechaInicial: Date, fechaFinal: Date }
    expect(res.body).toHaveProperty('clientes');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.clientes)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});
