import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { AnalyticsService } from './analytics.service'
import { ForecastQueryDto } from './dto/forecast-query.dto'
import { RfmQueryDto } from './dto/rfm-query.dto'

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * POST /analytics/generate-forecasts
   * Genera pronósticos para todos los productos
   */
  @Post('generate-forecasts')
  @Permissions('analytics.write')
  async generarPronosticos(@Query() query: ForecastQueryDto) {
    const { dias = 30, modelo = 'promedio_movil' } = query
    return this.analyticsService.generarTodosLosPronosticos(dias, modelo)
  }

  /**
   * GET /analytics/forecasts
   * Obtiene pronósticos guardados
   */
  @Get('forecasts')
  @Permissions('analytics.read')
  async obtenerPronosticos(@Query() query: ForecastQueryDto) {
    return this.analyticsService.obtenerPronosticos(query.productoId)
  }

  /**
   * POST /analytics/analyze-rfm
   * Ejecuta análisis RFM de clientes
   */
  @Post('analyze-rfm')
  @Permissions('analytics.write')
  async analizarRFM() {
    return this.analyticsService.analizarRFM()
  }

  /**
   * GET /analytics/clientes-segmentados
   * Obtiene clientes segmentados por RFM
   */
  @Get('clientes-segmentados')
  @Permissions('analytics.read')
  async obtenerClientesSegmentados(@Query() query: RfmQueryDto) {
    return this.analyticsService.obtenerClientesSegmentados(query.segmento as any)
  }

  /**
   * POST /analytics/generate-reposicion-alertas
   * Genera alertas de reposición
   */
  @Post('generate-reposicion-alertas')
  @Permissions('analytics.write')
  async generarAlertasReposicion() {
    return this.analyticsService.generarAlertasReposicion()
  }

  /**
   * GET /analytics/reposicion-alertas
   * Obtiene alertas de reposición
   */
  @Get('reposicion-alertas')
  @Permissions('analytics.read')
  async obtenerAlertasReposicion(@Query('estado') estado?: string) {
    return this.analyticsService.obtenerAlertasReposicion(estado as any)
  }

  /**
   * GET /analytics/tendencias
   * Obtiene tendencias de productos
   */
  @Get('tendencias')
  @Permissions('analytics.read')
  async obtenerTendencias() {
    return this.analyticsService.obtenerTendencias()
  }

  /**
   * GET /analytics/kpis
   * Obtiene KPIs del dashboard
   */
  @Get('kpis')
  @Permissions('analytics.read')
  async obtenerKPIs() {
    return this.analyticsService.obtenerKPIs()
  }

  /**
   * GET /analytics/dashboard
   * Obtiene datos completos del dashboard
   */
  @Get('dashboard')
  @Permissions('analytics.read')
  async obtenerDashboard() {
    const [kpis, tendencias, clientesVIP, alertas] = await Promise.all([
      this.analyticsService.obtenerKPIs(),
      this.analyticsService.obtenerTendencias(),
      this.analyticsService.obtenerClientesSegmentados('VIP' as any),
      this.analyticsService.obtenerAlertasReposicion(),
    ])

    return {
      kpis,
      tendencias: tendencias.slice(0, 10),
      clientesVIP: clientesVIP.slice(0, 10),
      alertas: alertas.slice(0, 10),
    }
  }

  /**
   * GET /analytics/top-forecasts
   * Obtiene los productos con mayores pronósticos de ventas
   */
  @Get('top-forecasts')
  @Permissions('analytics.read')
  async obtenerTopPronosticos(@Query('categoria') categoriaId?: string) {
    return this.analyticsService.obtenerTopPronosticos(
      categoriaId ? Number(categoriaId) : undefined,
    )
  }
}
