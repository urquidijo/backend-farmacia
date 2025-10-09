import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CarritoService } from './carrito.service'
import { AddToCarritoDto } from './dto/add-to-carrito.dto'
import { UpdateCarritoItemDto } from './dto/update-carrito-item.dto'

@Controller('carrito')
@UseGuards(AuthGuard('jwt'))
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Get()
  getCarrito(@Request() req) {
    return this.carritoService.getCarrito(req.user.id)
  }

  @Post()
  addToCarrito(@Request() req, @Body() dto: AddToCarritoDto) {
    return this.carritoService.addToCarrito(req.user.id, dto)
  }

  @Patch(':id')
  updateItem(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarritoItemDto,
  ) {
    return this.carritoService.updateItem(req.user.id, id, dto)
  }

  @Delete(':id')
  removeItem(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.carritoService.removeItem(req.user.id, id)
  }

  @Delete()
  clearCarrito(@Request() req) {
    return this.carritoService.clearCarrito(req.user.id)
  }

  @Post('checkout')
  createOrden(@Request() req) {
    return this.carritoService.createOrden(req.user.id)
  }
}
