import { Test, TestingModule } from '@nestjs/testing'
import { ClientesService } from './clientes.service'
import { PrismaService } from '../prisma/prisma.service'

const prismaStub = {
  cliente: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaService

describe('ClientesService', () => {
  let service: ClientesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        {
          provide: PrismaService,
          useValue: prismaStub,
        },
      ],
    }).compile()

    service = module.get<ClientesService>(ClientesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
