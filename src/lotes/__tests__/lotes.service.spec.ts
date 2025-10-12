import { LotesService } from '../lotes.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertsService } from '../../alerts/alerts.service'

const buildTx = () => ({
  producto: {
    findUnique: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1, stockActual: 5 }),
  },
  lote: {
    create: jest.fn().mockResolvedValue({ id: 10, cantidad: 5 }),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { cantidad: 5 } }),
  },
})

describe('LotesService', () => {
  let service: LotesService
  let prisma: jest.Mocked<PrismaService>
  let alerts: jest.Mocked<AlertsService>

  beforeEach(() => {
    prisma = {
      lote: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>

    alerts = {
      syncAllAlerts: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AlertsService>

    service = new LotesService(prisma, alerts)
  })

  it('create recalculates stock y dispara alertas', async () => {
    const tx = buildTx()
    prisma.$transaction.mockImplementation(async cb => cb(tx as any))

    const fecha = new Date('2030-01-01')
    prisma.lote.findUnique?.mockResolvedValue(null)

    const lote = await service.create(1, {
      codigo: 'TEST',
      cantidad: 5,
      fechaVenc: fecha,
    })

    expect(tx.producto.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(tx.lote.create).toHaveBeenCalledWith({
      data: {
        productoId: 1,
        codigo: 'TEST',
        cantidad: 5,
        fechaVenc: fecha,
      },
    })
    expect(tx.producto.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stockActual: 5 },
    })
    expect(alerts.syncAllAlerts).toHaveBeenCalledWith({ source: 'inventory' })
    expect(lote).toEqual({ id: 10, cantidad: 5 })
  })

  it('remove elimina lote y recalcula stock', async () => {
    const tx = buildTx()
    prisma.$transaction.mockImplementation(async cb => cb(tx as any))
    prisma.lote.findUnique?.mockResolvedValue({ id: 10, productoId: 1 })

    await service.remove(10)

    expect(tx.lote.delete).toHaveBeenCalledWith({ where: { id: 10 } })
    expect(tx.producto.update).toHaveBeenCalled()
    expect(alerts.syncAllAlerts).toHaveBeenCalledWith({ source: 'inventory' })
  })
})
