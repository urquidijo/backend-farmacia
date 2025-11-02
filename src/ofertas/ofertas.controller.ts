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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OfertasService } from './ofertas.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';

@Controller('ofertas')
@UseGuards(AuthGuard('jwt'))
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  @Post()
  create(@Body() createOfertaDto: CreateOfertaDto) {
    return this.ofertasService.create(createOfertaDto);
  }

  @Get()
  findAll() {
    return this.ofertasService.findAll();
  }

  @Get('activas')
  findActivas() {
    return this.ofertasService.findActivas();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOfertaDto: UpdateOfertaDto,
  ) {
    return this.ofertasService.update(id, updateOfertaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.remove(id);
  }

  @Post(':id/incrementar-usos')
  @HttpCode(HttpStatus.OK)
  incrementarUsos(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.incrementarUsos(id);
  }
}

