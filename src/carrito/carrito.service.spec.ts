import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CarritoService } from './carrito.service'
import { PrismaService } from '../prisma/prisma.service'
import { AlertsService } from '../alerts/alerts.service'

jest.mock('../rx-verify/rx-verify.service', () => ({
  RxVerifyService: jest.fn().mockImplementation(() => ({
    requireApproved: jest.fn(),
  })),
}))
import { RxVerifyService } from '../rx-verify/rx-verify.service'

const prismaMock = {
  producto: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  carritoItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  lote: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  orden: { create: jest.fn() },
  ordenItem: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
} as unknown as PrismaService

describe('CarritoService (caja blanca)', () => {
  let service: CarritoService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarritoService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AlertsService, useValue: { syncAllAlerts: jest.fn() } },
        { provide: RxVerifyService, useValue: { requireApproved: jest.fn() } },
      ],
    }).compile()

    service = module.get(CarritoService)
  })

  it('addToCarrito: lanza NotFound si el producto no existe', async () => {
    ;(prismaMock.producto.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(service.addToCarrito(1, { productoId: 99, cantidad: 1 })).rejects.toThrow(
      NotFoundException,
    )
  })

  it('addToCarrito: lanza BadRequest si el producto esta inactivo', async () => {
    ;(prismaMock.producto.findUnique as jest.Mock).mockResolvedValue({ id: 1, activo: false })
    await expect(service.addToCarrito(1, { productoId: 1, cantidad: 1 })).rejects.toThrow(
      BadRequestException,
    )
  })

  it('createOrden: lanza BadRequest si el carrito esta vacio', async () => {
    ;(prismaMock.carritoItem.findMany as jest.Mock).mockResolvedValue([])
    await expect(service.createOrden(1)).rejects.toThrow(BadRequestException)
  })
})
