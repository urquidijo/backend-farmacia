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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { OrdenesCompraService } from './ordenes-compra.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { UpdateOrdenCompraEstadoDto } from './dto/update-orden-compra-estado.dto';
import { QueryOrdenesCompraDto } from './dto/query-ordenes-compra.dto';
import { AddOrdenCompraItemDto } from './dto/add-orden-compra-item.dto';
import { UpdateOrdenCompraItemDto } from './dto/update-orden-compra-item.dto';

@Controller('ordenes-compra')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OrdenesCompraController {
  constructor(private readonly service: OrdenesCompraService) {}

  @Get()
  @Permissions('purchase.read')
  findAll(@Query() query: QueryOrdenesCompraDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Permissions('purchase.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('purchase.manage')
  create(@Body() dto: CreateOrdenCompraDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('purchase.manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenCompraDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/estado')
  @Permissions('purchase.manage')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenCompraEstadoDto,
  ) {
    return this.service.updateEstado(id, dto);
  }

  @Delete(':id')
  @Permissions('purchase.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/items')
  @Permissions('purchase.manage')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrdenCompraItemDto,
  ) {
    return this.service.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Permissions('purchase.manage')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrdenCompraItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Permissions('purchase.manage')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.removeItem(id, itemId);
  }
}
