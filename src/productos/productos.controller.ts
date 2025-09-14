import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProductosService } from './productos.service'
import { CreateProductoDto } from './dto/create-producto.dto'
import { UpdateProductoDto } from './dto/update-producto.dto'

@Controller('productos')
@UseGuards(AuthGuard('jwt'))
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto)
  }

  @Get()
  findAll() {
    return this.productosService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.remove(id)
  }
}
