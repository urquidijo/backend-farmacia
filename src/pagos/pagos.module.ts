import { Module } from '@nestjs/common'
import { PagosController } from './pagos.controller'
import { PagosService } from './pagos.service'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificacionesModule } from '../notificaciones/notificaciones.module'

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
