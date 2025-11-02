// src/carrito/carrito.module.ts
import { Module } from '@nestjs/common'
import { CarritoController } from './carrito.controller'
import { CarritoService } from './carrito.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AlertsModule } from '../alerts/alerts.module'
import { RxVerifyModule } from '../rx-verify/rx-verify.module' // ✅

@Module({
  imports: [PrismaModule, AlertsModule, RxVerifyModule], // ✅ importa el módulo
  controllers: [CarritoController],
  providers: [CarritoService],
})
export class CarritoModule {}
