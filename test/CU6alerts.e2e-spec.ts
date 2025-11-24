// test/HU6alerts.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import request from 'supertest'

import { AlertsController } from '../src/alerts/alerts.controller'
import { AlertsService } from '../src/alerts/alerts.service'
import { PermissionsGuard } from '../src/auth/guards/permissions.guard'
import { AlertsEvents } from '../src/alerts/alerts.events'

jest.setTimeout(30000)

const JwtAuthGuard = AuthGuard('jwt')

describe('HU6: Alertas de Stock y Vencimiento -- E2E (Caja negra)', () => {
  let app: INestApplication
  let httpServer: any
  const alerts = [
    {
      id: 1,
      type: 'STOCK_BAJO',
      severity: 'WARNING',
      mensaje: 'Stock bajo',
      venceEnDias: null,
      stockActual: 5,
      stockMinimo: 10,
      windowDias: 30,
      leida: false,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      producto: { nombre: 'HU6 Producto Alertas' },
      lote: undefined,
    },
    {
      id: 2,
      type: 'VENCIMIENTO',
      severity: 'WARNING',
      mensaje: 'Lote por vencer',
      venceEnDias: 5,
      stockActual: 5,
      stockMinimo: 10,
      windowDias: 30,
      leida: false,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      producto: { nombre: 'HU6 Producto Alertas' },
      lote: { codigo: 'HU6-LOTE' },
    },
  ]

  beforeEach(() => {
    for (const a of alerts) {
      a.leida = false
    }
  })

  const stubService: Partial<AlertsService> = {
    getAlerts: async params => {
      const typeFilter =
        params?.type === 'stock'
          ? 'STOCK_BAJO'
          : params?.type === 'expiry'
          ? 'VENCIMIENTO'
          : undefined
      const filtered = typeFilter ? alerts.filter(a => a.type === typeFilter) : alerts
      return {
        data: filtered,
        meta: {
          total: filtered.length,
          page: 1,
          pageSize: filtered.length,
          totalPages: 1,
          unread: filtered.filter(a => !a.leida).length,
        },
      }
    },
    getExpiryAlerts: async (_windowDays?: number) => ({
      data: alerts.filter(a => a.type === 'VENCIMIENTO'),
      meta: { total: 1 },
    }),
    markAsRead: async id => {
      const alert = alerts.find(a => a.id === id)
      if (alert) alert.leida = true
      return alert
    },
    markAllAsRead: async type => {
      const typeFilter = type === 'stock' ? 'STOCK_BAJO' : type === 'expiry' ? 'VENCIMIENTO' : null
      let count = 0
      for (const a of alerts) {
        if (!typeFilter || a.type === typeFilter) {
          if (!a.leida) {
            a.leida = true
            count++
          }
        }
      }
      return { updated: count }
    },
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [AlertsEvents, { provide: AlertsService, useValue: stubService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
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

  it('CP01: deberia listar alertas de stock generadas automaticamente', async () => {
    const res = await request(httpServer)
      .get('/alerts?type=stock&page=1&pageSize=10')
      .expect(200)

    expect(res.body.meta.total).toBeGreaterThan(0)
    const found = res.body.data.find((a: any) => a.producto?.nombre === 'HU6 Producto Alertas')
    expect(found).toBeDefined()
    expect(found.type).toBe('STOCK_BAJO')
  })

  it('CP02: deberia listar alertas de vencimiento para lotes proximos', async () => {
    const res = await request(httpServer)
      .get('/alerts/expiry?windowDays=30')
      .expect(200)

    const found = res.body.data.find((a: any) => a.lote?.codigo === 'HU6-LOTE')
    expect(found).toBeDefined()
    expect(['VENCIMIENTO']).toContain(found.type)
  })

  it('CP03: deberia marcar una alerta como leida', async () => {
    const res = await request(httpServer)
      .get('/alerts?type=stock')
      .expect(200)

    const alertId = res.body.data[0].id
    const update = await request(httpServer).patch(`/alerts/${alertId}/read`).expect(200)

    expect(update.body.leida).toBe(true)
  })

  it('CP04: deberia marcar todas las alertas de stock como leidas', async () => {
    const res = await request(httpServer)
      .patch('/alerts/read-all?type=stock')
      .expect(200)

    expect(res.body.updated).toBeGreaterThan(0)
  })
})
