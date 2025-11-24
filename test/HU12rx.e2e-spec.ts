// test/HU12rx.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'

import { RxVerifyController } from '../src/rx-verify/rx-verify.controller'
import { RxVerifyService } from '../src/rx-verify/rx-verify.service'

jest.setTimeout(30000)

describe('CU12: Consultar y Validar Recetas Digitales -- E2E', () => {
  let app: INestApplication
  let httpServer: any
  const mockSvc = {
    cartNeedsRx: jest.fn().mockResolvedValue({ needsRx: true }),
    verifyPrescription: jest.fn().mockResolvedValue({
      ok: true,
      matched: [],
      missing: [],
      verificationId: 'verif-123',
    }),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RxVerifyController],
      providers: [{ provide: RxVerifyService, useValue: mockSvc }],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    httpServer = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it('CP01: deberia indicar que el carrito necesita receta', async () => {
    const res = await request(httpServer)
      .post('/rx/needs')
      .set('x-user-id', '10')
      .expect(201)

    expect(res.body.needsRx).toBe(true)
    expect(mockSvc.cartNeedsRx).toHaveBeenCalled()
  })

  it('CP02: deberia validar receta y devolver verificationId', async () => {
    const res = await request(httpServer)
      .post('/rx/verify')
      .set('x-user-id', '10')
      .send({ imageBase64: 'data:image/png;base64,AAA' })
      .expect(201)

    expect(res.body.verificationId).toBe('verif-123')
    expect(res.body.ok).toBe(true)
    expect(mockSvc.verifyPrescription).toHaveBeenCalled()
  })
})
