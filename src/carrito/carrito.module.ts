import { Module } from '@nestjs/common'
import { CarritoController } from './carrito.controller'
import { CarritoService } from './carrito.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AlertsModule } from '../alerts/alerts.module'

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [CarritoController],
  providers: [CarritoService],
})
export class CarritoModule {}
