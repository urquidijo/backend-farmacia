import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { BackupService } from './backup.service'

describe('BackupService (caja blanca)', () => {
  let service: BackupService

  beforeEach(async () => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = 'postgres://test'
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupService],
    }).compile()

    service = module.get(BackupService)
  })

  it('restore: lanza BadRequest si extension no es valida', async () => {
    await expect(service.restore(Buffer.from('x'), { filename: 'invalid.txt' })).rejects.toThrow(
      BadRequestException,
    )
  })

  it('restore: lanza InternalServerError si falta DATABASE_URL', async () => {
    delete process.env.DATABASE_URL
    await expect(service.restore(Buffer.from('x'), { filename: 'file.sql' })).rejects.toThrow(
      InternalServerErrorException,
    )
  })
})
