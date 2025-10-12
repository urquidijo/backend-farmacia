import { Module } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { AlertsEvents } from './alerts.events'
import { AlertsScheduler } from './alerts.scheduler'

@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsEvents, AlertsScheduler],
  exports: [AlertsService, AlertsEvents],
})
export class AlertsModule {}
