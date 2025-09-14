import { Module } from '@nestjs/common'
import { MarcasService } from './marcas.service'
import { MarcasController } from './marcas.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService],
})
export class MarcasModule {}