import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AlertsController } from '../src/alerts/alerts.controller'
import { AlertsService } from '../src/alerts/alerts.service'
import { AlertsEvents } from '../src/alerts/alerts.events'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../src/auth/guards/permissions.guard'
import { of } from 'rxjs'

describe('AlertsController (e2e)', () => {
  let app: INestApplication
  const alertsServiceMock = {
    getAlerts: jest.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, totalPages: 1, unread: 0 },
    }),
    getStockAlerts: jest.fn(),
    getExpiryAlerts: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        { provide: AlertsService, useValue: alertsServiceMock },
        {
          provide: AlertsEvents,
          useValue: { stream: jest.fn(() => of()) },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('/alerts (GET)', async () => {
    await request(app.getHttpServer()).get('/alerts').expect(200).expect({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, totalPages: 1, unread: 0 },
    })
  })
})
