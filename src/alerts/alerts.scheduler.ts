import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AlertsService } from './alerts.service'

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name)

  constructor(private readonly alertsService: AlertsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleNightlyScan() {
    try {
      await this.alertsService.syncAllAlerts({ source: 'cron' })
    } catch (error) {
      this.logger.error('Fallo al procesar alertas programadas', error.stack ?? error)
    }
  }
}
