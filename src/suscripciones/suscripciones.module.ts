import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { SuscripcionesController } from './suscripciones.controller'
import { SuscripcionesScheduler } from './suscripciones.scheduler'
import { SuscripcionesService } from './suscripciones.service'

@Module({
  imports: [PrismaModule],
  controllers: [SuscripcionesController],
  providers: [SuscripcionesService, SuscripcionesScheduler],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}
