import { Module } from '@nestjs/common'
import { ProductosService } from './productos.service'
import { ProductosController } from './productos.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}