import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SuscripcionesService } from './suscripciones.service'

@Injectable()
export class SuscripcionesScheduler {
  private readonly logger = new Logger(SuscripcionesScheduler.name)

  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  /**
   * Procesar suscripciones cada 6 horas
   * Se ejecuta a las 00:00, 06:00, 12:00 y 18:00
   */
  @Cron('0 */6 * * *', {
    name: 'process-subscriptions',
    timeZone: 'America/La_Paz', // Ajustar a tu zona horaria
  })
  async handleSubscriptionProcessing() {
    this.logger.log('Iniciando procesamiento de suscripciones programadas')

    try {
      const results = await this.suscripcionesService.processDueSubscriptions()

      this.logger.log(
        `Procesamiento completado: ${results.success} exitosas, ${results.failed} fallidas`,
      )
    } catch (error) {
      this.logger.error('Error en el procesamiento de suscripciones', error.stack)
    }
  }

  /**
   * Tarea de mantenimiento: limpiar logs antiguos
   * Se ejecuta todos los días a las 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'cleanup-old-logs',
    timeZone: 'America/La_Paz',
  })
  async cleanupOldLogs() {
    this.logger.log('Limpiando logs antiguos de suscripciones')

    try {
      // Mantener solo los logs de los últimos 90 días
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      // Esta funcionalidad se puede implementar si se desea
      // const deleted = await this.prisma.suscripcionLog.deleteMany({
      //   where: { createdAt: { lt: ninetyDaysAgo } }
      // })

      // this.logger.log(`${deleted.count} logs antiguos eliminados`)
    } catch (error) {
      this.logger.error('Error limpiando logs antiguos', error.stack)
    }
  }
}
