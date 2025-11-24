// test/HU8carrito.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import request from 'supertest'

import { CarritoController } from '../src/carrito/carrito.controller'
import { PermissionsGuard } from '../src/auth/guards/permissions.guard'
import { CarritoService } from '../src/carrito/carrito.service'
import { AlertsService } from '../src/alerts/alerts.service'
import { RxVerifyService } from '../src/rx-verify/rx-verify.service'

jest.setTimeout(30000)

const JwtAuthGuard = AuthGuard('jwt')

type Item = {
  id: number
  userId: number
  productoId: number
  cantidad: number
  producto: {
    id: number
    nombre: string
    precio: number
    imageUrl?: string | null
    stockActual?: number
    requiereReceta?: boolean
    marca?: { nombre: string }
  }
}

describe('HU8: Venta online y carrito de compras -- E2E', () => {
  let app: INestApplication
  let httpServer: any
  let carritoItemId: number
  const userId = 1
  const productoId = 1

  const items: Item[] = []
  const orders: any[] = []

  beforeEach(() => {
    items.length = 0
    orders.length = 0
    carritoItemId = 1
  })

  const stubCarrito: Partial<CarritoService> = {
    getCarrito: async uid => items.filter(i => i.userId === uid),
    addToCarrito: async (uid, dto: { productoId: number; cantidad: number }) => {
      const item: Item = {
        id: carritoItemId++,
        userId: uid,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
        producto: {
          id: productoId,
          nombre: 'HU8 Producto Carrito',
          precio: 30,
          imageUrl: null,
          stockActual: 20,
          requiereReceta: false,
          marca: { nombre: 'HU8 Marca' },
        },
      }
      items.push(item)
      return item
    },
    updateItem: async (_uid, itemId: number, dto: { cantidad: number }) => {
      const item = items.find(i => i.id === itemId)
      if (item) item.cantidad = dto.cantidad
      return item
    },
    removeItem: async (_uid, itemId: number) => {
      const idx = items.findIndex(i => i.id === itemId)
      if (idx >= 0) items.splice(idx, 1)
      return { message: 'Item eliminado' }
    },
    clearCarrito: async uid => {
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].userId === uid) items.splice(i, 1)
      }
      return { message: 'Carrito vaciado' }
    },
    createOrden: async uid => {
      const userItems = items.filter(i => i.userId === uid)
      const total = userItems.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
      const orden = {
        id: orders.length + 1,
        userId: uid,
        total,
        items: userItems.map(i => ({
          ...i,
          precioUnitario: i.producto.precio,
          subtotal: i.producto.precio * i.cantidad,
        })),
      }
      orders.push(orden)
      await stubCarrito.clearCarrito?.(uid)
      return orden
    },
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CarritoController],
      providers: [
        { provide: CarritoService, useValue: stubCarrito },
        { provide: AlertsService, useValue: { syncAllAlerts: jest.fn() } },
        { provide: RxVerifyService, useValue: { requireApproved: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest()
          req.user = { id: userId }
          return true
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    httpServer = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it('CP01: deberia obtener el carrito vacio', async () => {
    const res = await request(httpServer).get('/carrito').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(0)
  })

  it('CP02: deberia agregar un producto al carrito', async () => {
    const res = await request(httpServer)
      .post('/carrito')
      .send({ productoId, cantidad: 2 })
      .expect(201)

    carritoItemId = res.body.id
    expect(res.body.producto.nombre).toBe('HU8 Producto Carrito')
    expect(res.body.cantidad).toBe(2)
  })

  it('CP03: deberia actualizar la cantidad de un item', async () => {
    const add = await request(httpServer).post('/carrito').send({ productoId, cantidad: 2 })
    const itemId = add.body.id
    const res = await request(httpServer)
      .patch(`/carrito/${itemId}`)
      .send({ cantidad: 3 })
      .expect(200)

    expect(res.body.cantidad).toBe(3)
  })

  it('CP04: deberia generar una orden al hacer checkout y vaciar el carrito', async () => {
    await request(httpServer).post('/carrito').send({ productoId, cantidad: 2 })

    const res = await request(httpServer).post('/carrito/checkout').send({}).expect(201)

    expect(res.body.id).toBeDefined()
    expect(res.body.items.length).toBeGreaterThan(0)
    expect(res.body.total).toBeGreaterThan(0)

    const carrito = await request(httpServer).get('/carrito').expect(200)
    expect(carrito.body.length).toBe(0)
  })
})
