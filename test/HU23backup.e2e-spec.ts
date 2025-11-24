// test/HU23backup.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { Readable } from 'node:stream'

import { BackupModule } from '../src/backup/backup.module'
import { BackupService } from '../src/backup/backup.service'

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn(async () => ({ Body: Readable.from(['backup-bytes']) }))
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    GetObjectCommand: jest.fn(),
  }
})

jest.setTimeout(30000)

describe('CU23: Generar Backup -- E2E', () => {
  let app: INestApplication
  let httpServer: any

  beforeAll(async () => {
    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_ACCESS_KEY_ID = 'fake'
    process.env.AWS_SECRET_ACCESS_KEY = 'fake'
    process.env.S3_BUCKET = 'fake-bucket'

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BackupModule],
    })
      .overrideProvider(BackupService)
      .useValue({
        restore: jest.fn().mockResolvedValue({
          ok: true,
          restoredFrom: 'backup.sql',
          format: 'sql',
        }),
      })
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    httpServer = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it('CP01: deberia exportar backup en formato sql', async () => {
    const res = await request(httpServer)
      .get('/backup/export?format=sql')
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .expect(200)

    expect(res.headers['content-disposition']).toContain('farmaciabackup.sql.gz')
    expect(res.body.toString()).toBe('backup-bytes')
  })

  it('CP02: deberia restaurar backup aceptando archivo valido', async () => {
    const res = await request(httpServer)
      .post('/backup/restore')
      .attach('file', Buffer.from('dummy-sql'), 'backup.sql')
      .expect(201)

    expect(res.body.ok).toBe(true)
    expect(res.body.restoredFrom).toBe('backup.sql')
  })
})
