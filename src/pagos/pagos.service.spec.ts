import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { PagosService } from './pagos.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacionesService } from '../notificaciones/notificaciones.service'

jest.mock('stripe', () => {
  const ctor: any = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'sess', url: 'https://pay' }),
      },
    },
    invoices: { retrieve: jest.fn() },
    paymentIntents: { retrieve: jest.fn() },
    webhooks: { constructEvent: jest.fn((body: any) => body) },
  }))
  return { __esModule: true, default: ctor }
})

const prismaMock = {
  orden: { findUnique: jest.fn(), update: jest.fn() },
  pago: { upsert: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
} as unknown as PrismaService

describe('PagosService (caja blanca)', () => {
  let service: PagosService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificacionesService, useValue: { sendPaymentSuccessNotification: jest.fn() } },
      ],
    }).compile()
    service = module.get(PagosService)
    process.env.STRIPE_SECRET_KEY = 'sk_test'
  })

  it('crearPago: devuelve BadRequest si la orden no existe', async () => {
    ;(prismaMock.orden.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(service.crearPago(1, 100, 'usd')).rejects.toThrow(BadRequestException)
  })

  it('crearPago: devuelve BadRequest si la orden no esta pendiente', async () => {
    ;(prismaMock.orden.findUnique as jest.Mock).mockResolvedValue({ id: 1, estado: 'PAGADA' })
    await expect(service.crearPago(1, 100, 'usd')).rejects.toThrow(BadRequestException)
  })
})
