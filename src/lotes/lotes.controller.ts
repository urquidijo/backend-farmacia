import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { LotesService } from './lotes.service'
import { CreateLoteDto } from './dto/create-lote.dto'
import { UpdateLoteDto } from './dto/update-lote.dto'

@Controller()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Get('productos/:productoId/lotes')
  @Permissions('inv.read')
  findByProducto(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.lotesService.findByProducto(productoId)
  }

  @Post('productos/:productoId/lotes')
  @Permissions('inv.move')
  create(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() dto: CreateLoteDto,
  ) {
    return this.lotesService.create(productoId, dto)
  }

  @Patch('lotes/:id')
  @Permissions('inv.move')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLoteDto,
  ) {
    return this.lotesService.update(id, dto)
  }

  @Delete('lotes/:id')
  @Permissions('inv.move')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lotesService.remove(id)
  }
}
