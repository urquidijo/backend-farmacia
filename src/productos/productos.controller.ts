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
  Query,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProductosService } from './productos.service'
import { CreateProductoDto } from './dto/create-producto.dto'
import { UpdateProductoDto } from './dto/update-producto.dto'
import { S3Service } from '../s3/s3.service'

@Controller('productos')
@UseGuards(AuthGuard('jwt'))
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto)
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('proveedorId') proveedorId?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const sizeNum = size ? parseInt(size) : 10
    const proveedor = proveedorId ? parseInt(proveedorId) : undefined
    return this.productosService.findAll(q, pageNum, sizeNum, proveedor)
  }

  @Get('presign')
  async getPresignedUrl(
    @Query('filename') filename?: string,
    @Query('contentType') contentType?: string,
  ) {
    const safe = (filename ?? 'img.webp').replace(/\s+/g, '-').toLowerCase()
    const key = `productos/tmp/${Date.now()}-${safe}`
    return this.s3Service.putPresign(key, contentType || 'image/webp')
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
