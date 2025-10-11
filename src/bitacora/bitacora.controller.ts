import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { BitacoraService } from './bitacora.service';
import { CreateBitacoraDto } from './dto/create-bitacora.dto';
import { QueryBitacoraDto } from './dto/query-bitacora.dto';

@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly service: BitacoraService) {}

  // POST /bitacora
  @Post()
  create(@Body() dto: CreateBitacoraDto) {
    return this.service.create(dto);
  }

  // GET /bitacora?userId=&estado=&desde=&hasta=&page=&perPage=
  @Get()
  findAll(@Query() q: QueryBitacoraDto) {
    return this.service.findAll(q);
  }

  // GET /bitacora/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // DELETE /bitacora/:id  (opcional en producción)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
