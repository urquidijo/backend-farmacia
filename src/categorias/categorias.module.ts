import { Module } from '@nestjs/common'
import { CategoriasService } from './categorias.service'
import { CategoriasController } from './categorias.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}