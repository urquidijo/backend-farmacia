// test/HU2productos.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductosModule } from '../src/productos/productos.module';

// Mock S3 (por si el módulo lo inyecta)
jest.mock('../src/s3/s3.service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    putPresign: jest.fn().mockResolvedValue({
      url: 'https://fake-s3-url.com/upload',
      key: 'productos/tmp/fake.webp',
      expiresIn: 3600,
    }),
  })),
}));

// Fake AuthGuard para saltarse el JWT
const JwtAuthGuard = AuthGuard('jwt');

jest.setTimeout(30000);

describe('HU2: Registrar Producto – E2E (Caja Negra)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: any;

  let marcaId: number;
  let categoriaId: number;
  let unidadId: number;
  let proveedorId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ProductosModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    // Limpieza SOLO de productos de esta HU (no tocamos todo)
    await prisma.producto.deleteMany({
      where: { nombre: 'HU2 Producto Test' },
    });

    // Buscar o crear datos base (marca, categoría, unidad, proveedor)
    let marca = await prisma.marca.findFirst({
      where: { nombre: 'HU2 Marca Test' },
    });
    if (!marca) {
      marca = await prisma.marca.create({
        data: { nombre: 'HU2 Marca Test' },
      });
    }

    let categoria = await prisma.categoria.findFirst({
      where: { nombre: 'HU2 Categoria Test' },
    });
    if (!categoria) {
      categoria = await prisma.categoria.create({
        data: { nombre: 'HU2 Categoria Test' },
      });
    }

    let unidad = await prisma.unidad.findFirst({
      where: { codigo: 'HU2UND' },
    });
    if (!unidad) {
      unidad = await prisma.unidad.create({
        data: { codigo: 'HU2UND', nombre: 'HU2 Unidad Test' },
      });
    }

    let proveedor = await prisma.proveedor.findFirst({
      where: { nombre: 'HU2 Proveedor Test' },
    });
    if (!proveedor) {
      proveedor = await prisma.proveedor.create({
        data: { nombre: 'HU2 Proveedor Test' },
      });
    }

    marcaId = marca.id;
    categoriaId = categoria.id;
    unidadId = unidad.id;
    proveedorId = proveedor.id;
  });

  afterAll(async () => {
    // No borramos marca/categoria/unidad/proveedor para no romper FKs
    await app.close();
  });

  // -------------------------------------------------------
  // CP01 – Registrar producto con datos válidos
  // -------------------------------------------------------
  it('CP01: debería crear un producto con datos válidos', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'HU2 Producto Test',
        descripcion: 'Producto de prueba HU2',
        stockMinimo: 5,
        marcaId,
        categoriaId,
        unidadId,
        proveedorId,
        precio: 50.5,
        // NO enviamos requiereReceta para probar el valor por defecto
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.nombre).toBe('HU2 Producto Test');
    // debería tomar el default false
    expect(res.body.requiereReceta).toBe(false);
  });

  // -------------------------------------------------------
  // CP02 – marcaId no existente
  // -------------------------------------------------------
  it('CP02: debe fallar si la marca no existe', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'HU2 Producto Marca Invalida',
        stockMinimo: 5,
        marcaId: marcaId + 999999, // marca inexistente
        categoriaId,
        unidadId,
        proveedorId,
        precio: 20,
      })
      .expect(400);

    // tu servicio lanza BadRequestException con mensaje "Marca con ID X no existe"
    expect(res.body.message).toContain('Marca');
  });

  // -------------------------------------------------------
  // CP03 – categoriaId no existente
  // -------------------------------------------------------
  it('CP03: debe fallar si la categoría no existe', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'HU2 Producto Categoria Invalida',
        stockMinimo: 5,
        marcaId,
        categoriaId: categoriaId + 999999,
        unidadId,
        proveedorId,
        precio: 20,
      })
      .expect(400);

    expect(res.body.message).toContain('Categoría');
  });

  // -------------------------------------------------------
  // CP04 – unidadId no existente
  // -------------------------------------------------------
  it('CP04: debe fallar si la unidad no existe', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'HU2 Producto Unidad Invalida',
        stockMinimo: 5,
        marcaId,
        categoriaId,
        unidadId: unidadId + 999999,
        proveedorId,
        precio: 20,
      })
      .expect(400);

    expect(res.body.message).toContain('Unidad');
  });

  // -------------------------------------------------------
  // CP05 – proveedorId no existente (si se envía)
  // -------------------------------------------------------
  it('CP05: debe fallar si el proveedor no existe', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'HU2 Producto Proveedor Invalido',
        stockMinimo: 5,
        marcaId,
        categoriaId,
        unidadId,
        proveedorId: proveedorId + 999999,
        precio: 20,
      })
      .expect(400);

    expect(res.body.message).toContain('Proveedor');
  });

  // -------------------------------------------------------
  // CP06 – Campos obligatorios vacíos / inválidos
  // -------------------------------------------------------
  it('CP06: no debe permitir crear producto con datos incompletos', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        // nombre faltante
        stockMinimo: 5,
        marcaId,
        categoriaId,
        unidadId,
        precio: null, // o string inválido según tu DTO
      })
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});
