import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AlertsService } from './alerts.service'
import { PrismaService } from '../prisma/prisma.service'
import { AlertsEvents } from './alerts.events'

const prismaMock = {
  alert: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService

describe('AlertsService (caja blanca)', () => {
  let service: AlertsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        AlertsEvents,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(30) },
        },
      ],
    }).compile()

    service = module.get(AlertsService)
  })

  it('markAsRead: debe lanzar NotFound si no existe o esta resuelta', async () => {
    ;(prismaMock.alert.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(service.markAsRead(1)).rejects.toThrow(NotFoundException)

    ;(prismaMock.alert.findUnique as jest.Mock).mockResolvedValue({
      id: 2,
      resolvedAt: new Date(),
    })
    await expect(service.markAsRead(2)).rejects.toThrow(NotFoundException)
  })

  it('markAsRead: debe marcar como leida y devolver alerta mapeada', async () => {
    const now = new Date()
    ;(prismaMock.alert.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      leida: false,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      type: 'STOCK_BAJO',
      severity: 'WARNING',
      mensaje: 'Stock bajo',
      venceEnDias: null,
      stockActual: 1,
      stockMinimo: 5,
      windowDias: 30,
      producto: { id: 10, nombre: 'Prod', stockActual: 1, stockMinimo: 5, marca: null, categoria: null, proveedor: null },
      lote: null,
    })

    ;(prismaMock.alert.update as jest.Mock).mockResolvedValue({
      id: 1,
      leida: true,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      type: 'STOCK_BAJO',
      severity: 'WARNING',
      mensaje: 'Stock bajo',
      venceEnDias: null,
      stockActual: 1,
      stockMinimo: 5,
      windowDias: 30,
      producto: { id: 10, nombre: 'Prod', stockActual: 1, stockMinimo: 5, marca: null, categoria: null, proveedor: null },
      lote: null,
    })

    const res = await service.markAsRead(1)
    expect(res.leida).toBe(true)
    expect(prismaMock.alert.update).toHaveBeenCalled()
  })

  it('markAllAsRead: debe delegar a updateMany y devolver conteo', async () => {
    ;(prismaMock.alert.updateMany as jest.Mock).mockResolvedValue({ count: 3 })
    const res = await service.markAllAsRead('stock')
    expect(res.updated).toBe(3)
    expect(prismaMock.alert.updateMany).toHaveBeenCalledWith({
      where: { leida: false, resolvedAt: null, type: 'STOCK_BAJO' },
      data: { leida: true },
    })
  })
})
