import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { EstadoSuscripcion } from '@prisma/client'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { CreateSuscripcionDto } from './dto/create-suscripcion.dto'
import { UpdateSuscripcionDto } from './dto/update-suscripcion.dto'
import { SuscripcionesService } from './suscripciones.service'

@Controller('suscripciones')
@UseGuards(AuthGuard('jwt'))
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  /**
   * Crear nueva suscripción
   */
  @Post()
  create(@Request() req, @Body() createSuscripcionDto: CreateSuscripcionDto) {
    return this.suscripcionesService.create(req.user.id, createSuscripcionDto)
  }

  /**
   * Obtener suscripciones del usuario autenticado
   */
  @Get('mis-suscripciones')
  findMySubscriptions(@Request() req, @Query('estado') estado?: EstadoSuscripcion) {
    return this.suscripcionesService.findByUser(req.user.id, estado)
  }

  /**
   * Obtener una suscripción específica
   */
  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.findOne(req.user.id, id)
  }

  /**
   * Actualizar suscripción
   */
  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSuscripcionDto: UpdateSuscripcionDto,
  ) {
    return this.suscripcionesService.update(req.user.id, id, updateSuscripcionDto)
  }

  /**
   * Pausar suscripción
   */
  @Patch(':id/pause')
  pause(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.pause(req.user.id, id)
  }

  /**
   * Reanudar suscripción
   */
  @Patch(':id/resume')
  resume(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.resume(req.user.id, id)
  }

  /**
   * Cancelar suscripción
   */
  @Delete(':id')
  cancel(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.suscripcionesService.cancel(req.user.id, id)
  }

  // ==================== RUTAS DE ADMINISTRADOR ====================

  /**
   * Obtener todas las suscripciones (admin)
   */
  @Get('admin/all')
  @Permissions('suscripciones.read')
  @UseGuards(PermissionsGuard)
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('estado') estado?: EstadoSuscripcion,
  ) {
    return this.suscripcionesService.findAll(page, limit, estado)
  }

  /**
   * Obtener estadísticas de suscripciones (admin)
   */
  @Get('admin/stats')
  @Permissions('suscripciones.read')
  @UseGuards(PermissionsGuard)
  getStats() {
    return this.suscripcionesService.getStats()
  }

  /**
   * Procesar suscripciones pendientes manualmente (admin)
   */
  @Post('admin/process')
  @Permissions('suscripciones.write')
  @UseGuards(PermissionsGuard)
  processSubscriptions() {
    return this.suscripcionesService.processDueSubscriptions()
  }
}
