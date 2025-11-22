// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';

jest.setTimeout(30000);

describe('AUTH – E2E (Caja Negra)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;

  const testEmail = 'authuser@test.com';
  const testPassword = '123456';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    httpServer = app.getHttpServer();
    prisma = app.get(PrismaService);

    // --- Preparamos un usuario real en BD para probar login ---
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // por si ya existe de una corrida anterior
    await prisma.user.deleteMany({ where: { email: testEmail } });

    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Auth',
        lastName: 'User',
        // status tiene default ACTIVE, así que no hace falta mandarlo
      },
    });
  });

  afterAll(async () => {
    // Limpieza opcional
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  // ---------------------------------------------------
  // 1. LOGIN EXITOSO
  // ---------------------------------------------------
  it('Debería hacer login exitoso y devolver token + cookie', async () => {
    const res = await request(httpServer)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    expect(res.body.message).toBe('ok');
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.body.ip).toBeDefined();
    expect(typeof res.body.ip).toBe('string');
  });

  // ---------------------------------------------------
  // 2. LOGIN FALLIDO – contraseña incorrecta
  // ---------------------------------------------------
  it('Debería fallar login con credenciales inválidas', async () => {
    const res = await request(httpServer)
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrongpass' })
      .expect(401);

    expect(res.body.message).toBe('Credenciales inválidas');
    expect(res.body.ip).toBeDefined();
  });

  // ---------------------------------------------------
  // 3. LOGIN FALLIDO – email inexistente
  // ---------------------------------------------------
  it('Debería fallar login con usuario inexistente', async () => {
    const res = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'noexiste@test.com', password: '123456' })
      .expect(401);

    expect(res.body.message).toBe('Credenciales inválidas');
  });

  // ---------------------------------------------------
  // 4. LOGOUT
  // ---------------------------------------------------
  it('Debería limpiar la cookie al hacer logout', async () => {
    const res = await request(httpServer)
      .post('/auth/logout')
      .expect(201);

    expect(res.body.message).toBe('bye');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
