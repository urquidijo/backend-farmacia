import { ConfigService } from '@nestjs/config'
import { AlertsService } from '../alerts.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertsEvents } from '../alerts.events'
import { AlertSeverity } from '@prisma/client'

const prismaMock = {
  producto: { findMany: jest.fn() },
  alert: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  lote: { findMany: jest.fn() },
  $transaction: jest.fn(),
}

const configMock = {
  get: jest.fn(),
} as unknown as ConfigService

const eventsMock = {
  emit: jest.fn(),
  stream: jest.fn(),
} as unknown as AlertsEvents

describe('AlertsService helpers', () => {
  let service: AlertsService

  beforeEach(() => {
    jest.resetAllMocks()
    service = new AlertsService(
      prismaMock as unknown as PrismaService,
      configMock,
      eventsMock,
    )
  })

  describe('evaluateStockAlert', () => {
    it('returns critical when stock is zero', () => {
      const result = service['evaluateStockAlert']({
        nombre: 'Prod',
        stockActual: 0,
        stockMinimo: 5,
      })
      expect(result).toEqual({
        severity: AlertSeverity.CRITICAL,
        message: 'Sin stock disponible',
        stockActual: 0,
        stockMinimo: 5,
      })
    })

    it('returns warning when stock is below minimum', () => {
      const result = service['evaluateStockAlert']({
        nombre: 'Prod',
        stockActual: 3,
        stockMinimo: 5,
      })
      expect(result).toEqual({
        severity: AlertSeverity.WARNING,
        message: 'Stock bajo (3/5)',
        stockActual: 3,
        stockMinimo: 5,
      })
    })

    it('returns null when stock is healthy', () => {
      const result = service['evaluateStockAlert']({
        nombre: 'Prod',
        stockActual: 10,
        stockMinimo: 5,
      })
      expect(result).toBeNull()
    })
  })

  describe('evaluateExpiryAlert', () => {
    const baseLote = {
      id: 1,
      productoId: 1,
      codigo: 'L1',
      cantidad: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      producto: { nombre: 'Prod', stockActual: 5, stockMinimo: 3 },
    } as const

    it('returns critical when already expired', () => {
      const lote = {
        ...baseLote,
        fechaVenc: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }
      const result = service['evaluateExpiryAlert'](lote as any, 30)
      expect(result).toEqual(
        expect.objectContaining({ severity: AlertSeverity.CRITICAL }),
      )
    })

    it('returns warning when within window', () => {
      const lote = {
        ...baseLote,
        fechaVenc: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }
      const result = service['evaluateExpiryAlert'](lote as any, 15)
      expect(result).toEqual(
        expect.objectContaining({
          severity: AlertSeverity.WARNING,
        }),
      )
    })

    it('returns info when within double window', () => {
      const lote = {
        ...baseLote,
        fechaVenc: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      }
      const result = service['evaluateExpiryAlert'](lote as any, 15)
      expect(result).toEqual(
        expect.objectContaining({
          severity: AlertSeverity.INFO,
        }),
      )
    })

    it('returns null when outside window', () => {
      const lote = {
        ...baseLote,
        fechaVenc: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      }
      const result = service['evaluateExpiryAlert'](lote as any, 30)
      expect(result).toBeNull()
    })
  })
})
