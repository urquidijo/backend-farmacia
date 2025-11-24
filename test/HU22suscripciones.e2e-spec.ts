// test/HU22suscripciones.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import request from 'supertest'

import { SuscripcionesController } from '../src/suscripciones/suscripciones.controller'
import { SuscripcionesService } from '../src/suscripciones/suscripciones.service'
import { PermissionsGuard } from '../src/auth/guards/permissions.guard'

jest.setTimeout(30000)

const JwtAuthGuard = AuthGuard('jwt')

type Susc = {
  id: number
  userId: number
  productoId: number
  cantidad: number
  frecuencia: string
  estado: string
  diaSemana?: number
  diaMes?: number
  diasPersonalizado?: number
}

describe('CU22: Suscripcion de Medicamento -- E2E', () => {
  let app: INestApplication
  let httpServer: any
  const userId = 1
  const productoId = 1
  let suscripcionId: number

  const suscripciones: Susc[] = []

  beforeEach(() => {
    suscripciones.length = 0
  })

  const stubService: Partial<SuscripcionesService> = {
    create: async (_uid, dto) => {
      const created: Susc = {
        id: suscripciones.length + 1,
        userId,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
        frecuencia: dto.frecuencia,
        estado: 'ACTIVA',
        diaSemana: dto.diaSemana,
        diaMes: dto.diaMes,
        diasPersonalizado: dto.diasPersonalizado,
      }
      suscripciones.push(created)
      return created as any
    },
    findByUser: async (_uid, _estado) => suscripciones,
    findOne: async (_uid, id) => suscripciones.find(s => s.id === id) as any,
    update: async (_uid, id, dto) => {
      const s = suscripciones.find(sc => sc.id === id)
      if (s) {
        Object.assign(s, dto)
      }
      return s as any
    },
    pause: async (_uid, id) => {
      const s = suscripciones.find(sc => sc.id === id)
      if (s) s.estado = 'PAUSADA'
      return s as any
    },
    resume: async (_uid, id) => {
      const s = suscripciones.find(sc => sc.id === id)
      if (s) s.estado = 'ACTIVA'
      return s as any
    },
    cancel: async (_uid, id) => {
      const s = suscripciones.find(sc => sc.id === id)
      if (s) s.estado = 'CANCELADA'
      return s as any
    },
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SuscripcionesController],
      providers: [{ provide: SuscripcionesService, useValue: stubService }],
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

  it('CP01: deberia crear una suscripcion valida', async () => {
    const res = await request(httpServer)
      .post('/suscripciones')
      .send({
        productoId,
        cantidad: 2,
        frecuencia: 'SEMANAL',
        diaSemana: 1,
      })
      .expect(201)

    suscripcionId = res.body.id
    expect(res.body.productoId).toBe(productoId)
    expect(res.body.frecuencia).toBe('SEMANAL')
  })

  it('CP02: deberia listar mis suscripciones', async () => {
    suscripciones.push({
      id: 1,
      userId,
      productoId,
      cantidad: 1,
      frecuencia: 'SEMANAL',
      estado: 'ACTIVA',
      diaSemana: 1,
    })
    const res = await request(httpServer)
      .get('/suscripciones/mis-suscripciones')
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('CP03: deberia actualizar cantidad y frecuencia', async () => {
    suscripciones.push({
      id: 2,
      userId,
      productoId,
      cantidad: 2,
      frecuencia: 'SEMANAL',
      estado: 'ACTIVA',
      diaSemana: 1,
    })
    const res = await request(httpServer)
      .patch(`/suscripciones/2`)
      .send({
        cantidad: 3,
        frecuencia: 'MENSUAL',
        diaMes: 5,
      })
      .expect(200)

    expect(res.body.cantidad).toBe(3)
    expect(res.body.frecuencia).toBe('MENSUAL')
  })

  it('CP04: deberia pausar y reanudar la suscripcion', async () => {
    suscripciones.push({
      id: 3,
      userId,
      productoId,
      cantidad: 1,
      frecuencia: 'SEMANAL',
      estado: 'ACTIVA',
      diaSemana: 1,
    })
    const pause = await request(httpServer).patch(`/suscripciones/3/pause`).expect(200)
    expect(pause.body.estado).toBe('PAUSADA')

    const resume = await request(httpServer).patch(`/suscripciones/3/resume`).expect(200)
    expect(resume.body.estado).toBe('ACTIVA')
  })

  it('CP05: deberia cancelar la suscripcion', async () => {
    suscripciones.push({
      id: 4,
      userId,
      productoId,
      cantidad: 1,
      frecuencia: 'SEMANAL',
      estado: 'ACTIVA',
      diaSemana: 1,
    })
    const res = await request(httpServer).delete(`/suscripciones/4`).expect(200)
    expect(res.body.estado).toBe('CANCELADA')
  })
})
