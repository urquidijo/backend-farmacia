import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { SuscripcionesService } from './suscripciones.service'
import { PrismaService } from '../prisma/prisma.service'

const prismaMock = {
  producto: { findUnique: jest.fn() },
  suscripcion: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  suscripcionLog: { create: jest.fn() },
} as unknown as PrismaService

describe('SuscripcionesService (caja blanca)', () => {
  let service: SuscripcionesService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuscripcionesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()
    service = module.get(SuscripcionesService)
  })

  it('create: lanza NotFound si el producto no existe', async () => {
    ;(prismaMock.producto.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(
      service.create(1, { productoId: 1, cantidad: 1, frecuencia: 'SEMANAL', diaSemana: 1 } as any),
    ).rejects.toThrow(NotFoundException)
  })

  it('create: lanza BadRequest si producto esta inactivo', async () => {
    ;(prismaMock.producto.findUnique as jest.Mock).mockResolvedValue({ id: 1, activo: false })
    await expect(
      service.create(1, { productoId: 1, cantidad: 1, frecuencia: 'SEMANAL', diaSemana: 1 } as any),
    ).rejects.toThrow(BadRequestException)
  })
})
