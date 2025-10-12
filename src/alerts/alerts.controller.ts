import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AlertsService } from './alerts.service'
import { GetAlertsQueryDto } from './dto/get-alerts.dto'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { AlertSeverity } from '@prisma/client'
import { AlertsEvents } from './alerts.events'
import { Observable } from 'rxjs'

@Controller('alerts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly events: AlertsEvents,
  ) {}

  @Get()
  @Permissions('alert.read')
  getAlerts(@Query() query: GetAlertsQueryDto) {
    const severity = query.severity
      ? (query.severity.toUpperCase() as AlertSeverity)
      : undefined
    return this.alertsService.getAlerts({
      type: query.type,
      severity,
      windowDays: query.windowDays,
      unreadOnly: query.unreadOnly,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    })
  }

  @Get('stock')
  @Permissions('alert.read')
  getStockAlerts() {
    return this.alertsService.getStockAlerts()
  }

  @Get('expiry')
  @Permissions('alert.read')
  getExpiryAlerts(@Query() query: GetAlertsQueryDto) {
    return this.alertsService.getExpiryAlerts(query.windowDays)
  }

  @Patch(':id/read')
  @Permissions('alert.manage')
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.markAsRead(id)
  }

  @Patch('read-all')
  @Permissions('alert.manage')
  markAllAsRead(@Query('type') type?: 'stock' | 'expiry') {
    return this.alertsService.markAllAsRead(type)
  }

  @Sse('stream')
  @Permissions('alert.read')
  stream(): Observable<MessageEvent> {
    return this.events.stream()
  }
}
