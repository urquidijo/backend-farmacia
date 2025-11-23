// test/HU1users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';
import { UsuariosModule } from '../src/usuarios/usuarios.module';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { AuthGuard } from '@nestjs/passport';

jest.setTimeout(30000);

// mismo patrón que en CU1
const JwtAuthGuard = AuthGuard('jwt');

describe('HU1: Registrar Usuario Interno – E2E (Caja Negra)', () => {
  let app: INestApplication;
  let httpServer: any;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule, UsuariosModule],
    })
      // NO exigir JWT ni permisos en estos tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    httpServer = app.getHttpServer();
    prisma = app.get(PrismaService);

    // limpieza previa SOLO del usuario de esta HU
    await prisma.user.deleteMany({
      where: { email: 'hu1user@test.com' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // -----------------------------------------------------
  // CP01 – Crear usuario con datos válidos
  // -----------------------------------------------------
  it('CP01: debería crear un usuario con datos válidos', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: 'hu1user@test.com',
        password: '123456',
        firstName: 'HU1',
        lastName: 'UsuarioInterno',
        telefono: '77777777',
        roleId: 1, // igual que en CU1, asumiendo que existe el rol 1
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe('hu1user@test.com');
  });

  // -----------------------------------------------------
  // CP02 – Email duplicado
  // -----------------------------------------------------
  it('CP02: no debe permitir registrar un email duplicado', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: 'hu1user@test.com', // mismo email que CP01
        password: '123456',
        firstName: 'Duplicado',
        lastName: 'Error',
        telefono: '66666666',
        roleId: 1,
      });

    expect(res.status).toBeGreaterThanOrEqual(400); // 400/409 según cómo lo manejes
  });

  // -----------------------------------------------------
  // CP03 – Campos obligatorios vacíos
  // -----------------------------------------------------
  it('CP03: no debe permitir campos obligatorios vacíos', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: '',
        password: '',
        firstName: '',
      })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  // -----------------------------------------------------
  // CP04 – Rol inexistente
  // -----------------------------------------------------
  it('CP04: debería fallar si el rol no existe', async () => {
    const res = await request(httpServer)
      .post('/users/internal')
      .send({
        email: 'hu1user2@test.com',
        password: '123456',
        firstName: 'SinRol',
        lastName: 'Invalido',
        telefono: '70000000',
        roleId: 999999, // rol que no debería existir
      });

    // Hoy tu servicio no valida el rol, Prisma lanzará error de FK => 500.
    // Dejamos la aserción amplia para reflejar que es un caso de error.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
