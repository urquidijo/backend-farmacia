import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PedidosService } from './pedidos.service';
import { QueryPedidosDto } from './dto/query-pedidos.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';

@Controller('pedidos')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @Permissions('order.read')
  list(@Query() query: QueryPedidosDto) {
    return this.pedidosService.list(query);
  }

  @Get(':id')
  @Permissions('order.read')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findOne(id);
  }

  @Patch(':id/estado')
  @Permissions('order.manage')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoStatusDto,
  ) {
    return this.pedidosService.updateStatus(id, dto.estado);
  }
}
