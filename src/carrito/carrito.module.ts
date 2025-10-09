import { Module } from '@nestjs/common'
import { CarritoController } from './carrito.controller'
import { CarritoService } from './carrito.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CarritoController],
  providers: [CarritoService],
})
export class CarritoModule {}
