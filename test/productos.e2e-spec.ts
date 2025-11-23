// test/productos.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductosModule } from '../src/productos/productos.module';

// Mock S3
jest.mock('../src/s3/s3.service', () => ({
  S3Service: jest.fn().mockImplementation(() => ({
    putPresign: jest.fn().mockResolvedValue({
      url: 'https://fake-s3-url.com/upload',
      key: 'productos/tmp/fake.webp',
      expiresIn: 3600,
    }),
  })),
}));

// Fake Auth
class FakeAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

const JwtAuthGuard = AuthGuard('jwt');

jest.setTimeout(30000);

describe('CU4: Gestionar Productos – E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: any;

  let marcaId: number;
  let categoriaId: number;
  let unidadId: number;
  let proveedorId: number;
  let productoId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ProductosModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    // --- Buscar o crear MARCA ---
    let marca = await prisma.marca.findFirst({ where: { nombre: 'Marca Test' } });
    if (!marca) {
      marca = await prisma.marca.create({ data: { nombre: 'Marca Test' } });
    }
    marcaId = marca.id;

    // --- Buscar o crear CATEGORIA ---
    let categoria = await prisma.categoria.findFirst({ where: { nombre: 'Categoria Test' } });
    if (!categoria) {
      categoria = await prisma.categoria.create({ data: { nombre: 'Categoria Test' } });
    }
    categoriaId = categoria.id;

    // --- Buscar o crear UNIDAD ---
    let unidad = await prisma.unidad.findFirst({ where: { codigo: 'UND' } });
    if (!unidad) {
      unidad = await prisma.unidad.create({ data: { codigo: 'UND', nombre: 'Unidad Test' } });
    }
    unidadId = unidad.id;

    // --- Buscar o crear PROVEEDOR ---
    let proveedor = await prisma.proveedor.findFirst({ where: { nombre: 'Proveedor Test' } });
    if (!proveedor) {
      proveedor = await prisma.proveedor.create({ data: { nombre: 'Proveedor Test' } });
    }
    proveedorId = proveedor.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Crear producto
  it('Paso 1: debería crear un producto', async () => {
    const res = await request(httpServer)
      .post('/productos')
      .send({
        nombre: 'Producto Test',
        descripcion: 'Descripción test',
        stockMinimo: 10,
        marcaId,
        categoriaId,
        unidadId,
        proveedorId,
        precio: 50.5,
      })
      .expect(201);

    productoId = res.body.id;
    expect(productoId).toBeDefined();
  });

  // 2. Listar productos
  it('Paso 2: debería listar productos', async () => {
    const res = await request(httpServer).get('/productos').expect(200);

    expect(Array.isArray(res.body.productos)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  // 3. Buscar productos
  it('Paso 3: debería buscar productos por nombre', async () => {
    const res = await request(httpServer)
      .get('/productos?q=Producto')
      .expect(200);

    expect(res.body.productos.length).toBeGreaterThan(0);
  });

  // 4. Obtener detalle
  it('Paso 4: debería obtener detalle del producto', async () => {
    const res = await request(httpServer)
      .get(`/productos/${productoId}`)
      .expect(200);

    expect(res.body.id).toBe(productoId);
  });

  // 5. Actualizar
  it('Paso 5: debería actualizar el producto', async () => {
    const res = await request(httpServer)
      .patch(`/productos/${productoId}`)
      .send({ nombre: 'Producto Test Updated' })
      .expect(200);

    expect(res.body.nombre).toBe('Producto Test Updated');
  });

  // 6. Presign URL
  it('Paso 6: debería obtener una URL presignada', async () => {
    const res = await request(httpServer)
      .get('/productos/presign?filename=test.webp&contentType=image/webp')
      .expect(200);

    expect(res.body.url).toContain('fake-s3-url.com');
  });
});
