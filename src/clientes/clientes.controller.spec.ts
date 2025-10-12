import { Test, TestingModule } from '@nestjs/testing'
import { ClientesController } from './clientes.controller'
import { ClientesService } from './clientes.service'
import { PrismaService } from '../prisma/prisma.service'

const prismaStub = {
  cliente: {},
} as unknown as PrismaService

describe('ClientesController', () => {
  let controller: ClientesController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        ClientesService,
        {
          provide: PrismaService,
          useValue: prismaStub,
        },
      ],
    }).compile()

    controller = module.get<ClientesController>(ClientesController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
