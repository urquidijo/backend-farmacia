import { Module } from '@nestjs/common'
import { ProductosService } from './productos.service'
import { ProductosController } from './productos.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}