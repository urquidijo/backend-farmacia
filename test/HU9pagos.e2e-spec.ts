// test/HU9pagos.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'

import { PagosController } from '../src/pagos/pagos.controller'
import { PagosService } from '../src/pagos/pagos.service'
import { NotificacionesService } from '../src/notificaciones/notificaciones.service'

jest.mock('stripe', () => {
  const ctor: any = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'sess_mock',
          url: 'https://pay.test/session',
        }),
      },
    },
    invoices: {
      retrieve: jest.fn(async id => ({
        hosted_invoice_url: `https://invoice.test/${id}`,
      })),
    },
    paymentIntents: {
      retrieve: jest.fn(async () => ({
        latest_invoice: { hosted_invoice_url: 'https://invoice.test/latest' },
      })),
    },
    webhooks: {
      constructEvent: jest.fn((body, _sig, _secret) => body),
    },
  }))
  return { __esModule: true, default: ctor }
})

jest.setTimeout(30000)

describe('HU9/HU10: Pagos y Factura Electronica - E2E', () => {
  let app: INestApplication
  let httpServer: any

  const pagos: any[] = []
  const orders: any[] = []

  const stubService: Partial<PagosService> = {
    crearPago: async (ordenId: number) => {
      pagos.push({ id: pagos.length + 1, ordenId, stripeId: 'sess_mock', monto: 100, estado: 'PENDIENTE' })
      return { url: 'https://pay.test/session' }
    },
    manejarEventoStripe: async (event: any) => {
      const ordId = Number(event?.data?.object?.metadata?.ordenId ?? 1)
      const pago = pagos.find(p => p.ordenId === ordId)
      if (pago) {
        pago.estado = 'PAGADA'
        pago.facturaUrl = 'https://invoice.test/inv_mock'
      }
      const orden = orders.find(o => o.id === ordId)
      if (orden) orden.estado = 'PAGADA'
    },
    obtenerFactura: async (pagoId: number) => pagos.find(p => p.id === pagoId),
    listarFacturas: async () => pagos,
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [
        { provide: PagosService, useValue: stubService },
        { provide: NotificacionesService, useValue: { sendPaymentSuccessNotification: jest.fn() } },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    httpServer = app.getHttpServer()

    orders.push({
      id: 1,
      userId: 1,
      total: 100,
      estado: 'PENDIENTE',
      items: [
        {
          productoId: 1,
          cantidad: 1,
          precioUnitario: 100,
          subtotal: 100,
          producto: { nombre: 'Demo' },
        },
      ],
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('CP01: deberia crear una sesion de pago para la orden pendiente', async () => {
    const res = await request(httpServer)
      .post('/pagos/crear')
      .send({ ordenId: 1, monto: 100, moneda: 'usd' })
      .expect(201)

    expect(res.body.url).toContain('pay.test')
    expect(pagos[0]?.estado).toBe('PENDIENTE')
  })

  it('CP02: deberia procesar el webhook y marcar la orden como pagada con factura', async () => {
    await request(httpServer)
      .post('/pagos/webhook')
      .set('stripe-signature', 'sig_mock')
      .send({ data: { object: { metadata: { ordenId: '1', userId: '1' }, invoice: 'inv_mock', payment_intent: 'pi' } } })
      .expect(200)

    expect(pagos[0]?.estado).toBe('PAGADA')
    expect(pagos[0]?.facturaUrl).toContain('invoice.test')
  })

  it('CP03: deberia obtener la factura y listar facturas', async () => {
    const factura = await request(httpServer).get('/pagos/factura/1').expect(200)
    expect(factura.body.id).toBe(1)

    const lista = await request(httpServer).get('/pagos/facturas').expect(200)
    expect(Array.isArray(lista.body)).toBe(true)
    expect(lista.body.length).toBeGreaterThan(0)
  })
})
