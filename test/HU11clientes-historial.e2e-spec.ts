// test/HU11clientes-historial.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe, ExecutionContext, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import request from 'supertest'

import { ClientesController } from '../src/clientes/clientes.controller'
import { BitacoraController } from '../src/bitacora/bitacora.controller'
import { ClientesService } from '../src/clientes/clientes.service'
import { BitacoraService } from '../src/bitacora/bitacora.service'
import { PermissionsGuard } from '../src/auth/guards/permissions.guard'

jest.setTimeout(30000)

const JwtAuthGuard = AuthGuard('jwt')

describe('HU11: Gestionar Clientes e Historial -- E2E', () => {
  let app: INestApplication
  let httpServer: any
  let clienteId: number | undefined
  let bitacoraId: number | undefined
  const userId = 1

  const clientes: any[] = []
  const bitacora: any[] = []

  const stubClientes: Partial<ClientesService> = {
    create: async dto => {
      if (dto.nit && clientes.some(c => c.nit === dto.nit)) {
        throw new BadRequestException('Duplicado')
      }
      const created = { id: clientes.length + 1, ...dto }
      clientes.push(created)
      return created
    },
    findAll: async () => ({
      clientes,
      total: clientes.length,
      page: 1,
      size: clientes.length,
      totalPages: 1,
    }),
    findOne: async id => clientes.find(c => c.id === id),
    update: async (id, dto) => {
      const idx = clientes.findIndex(c => c.id === id)
      if (idx >= 0) clientes[idx] = { ...clientes[idx], ...dto }
      return clientes[idx]
    },
    remove: async id => {
      const idx = clientes.findIndex(c => c.id === id)
      if (idx >= 0) clientes.splice(idx, 1)
      return { id }
    },
  }

  const stubBitacora: Partial<BitacoraService> = {
    create: async dto => {
      const created = {
        id: bitacora.length + 1,
        ...dto,
        fecha_entrada: '2025-01-01',
        hora_entrada: '10:00:00',
      }
      bitacora.push(created)
      return created
    },
    findAll: async () => ({
      total: bitacora.length,
      page: 1,
      perPage: bitacora.length,
      items: bitacora,
    }),
    findOne: async id => bitacora.find(b => b.id === id),
    remove: async id => {
      const idx = bitacora.findIndex(b => b.id === id)
      if (idx >= 0) bitacora.splice(idx, 1)
      return { id }
    },
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController, BitacoraController],
      providers: [
        { provide: ClientesService, useValue: stubClientes },
        { provide: BitacoraService, useValue: stubBitacora },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest()
          req.user = { id: 999 }
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

  it('CP01: deberia crear un cliente y evitar duplicados', async () => {
    const res = await request(httpServer)
      .post('/clientes')
      .send({
        nombre: 'HU11',
        apellido: 'Cliente',
        nit: 'HU11-NIT',
        telefono: '70000000',
        email: 'hu11@test.com',
      })
      .expect(201)

    clienteId = res.body.id
    expect(res.body.email).toBe('hu11@test.com')

    const dup = await request(httpServer)
      .post('/clientes')
      .send({
        nombre: 'HU11 Dup',
        nit: 'HU11-NIT',
      })

    expect(dup.status).toBeGreaterThanOrEqual(400)
  })

  it('CP02: deberia listar y filtrar clientes', async () => {
    const res = await request(httpServer).get('/clientes?q=HU11').expect(200)

    expect(Array.isArray(res.body.clientes)).toBe(true)
    const found = res.body.clientes.find((c: any) => c.id === clienteId)
    expect(found).toBeDefined()
  })

  it('CP03: deberia actualizar y recuperar un cliente', async () => {
    const update = await request(httpServer)
      .patch(`/clientes/${clienteId}`)
      .send({ telefono: '79999999' })
      .expect(200)

    expect(update.body.telefono).toBe('79999999')

    const detalle = await request(httpServer).get(`/clientes/${clienteId}`).expect(200)
    expect(detalle.body.id).toBe(clienteId)
  })

  it('CP04: deberia registrar y consultar historial en bitacora', async () => {
    const createBitacora = await request(httpServer)
      .post('/bitacora')
      .send({
        userId,
        ip: '1.1.1.1',
        acciones: 'Login de prueba',
        estado: 'EXITOSO',
      })
      .expect(201)

    bitacoraId = createBitacora.body.id
    expect(createBitacora.body.estado).toBe('EXITOSO')

    const listado = await request(httpServer)
      .get(`/bitacora?userId=${userId}&estado=EXITOSO`)
      .expect(200)

    expect(listado.body.items.length).toBeGreaterThan(0)

    const detalle = await request(httpServer).get(`/bitacora/${bitacoraId}`).expect(200)
    expect(detalle.body.id).toBe(bitacoraId)
  })

  it('CP05: deberia eliminar el cliente', async () => {
    await request(httpServer).delete(`/clientes/${clienteId}`).expect(200)
  })
})
