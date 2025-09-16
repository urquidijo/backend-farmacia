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
import { UnidadesService } from './unidades.service'
import { CreateUnidadDto } from './dto/create-unidad.dto'
import { UpdateUnidadDto } from './dto/update-unidad.dto'

@Controller('unidades')
@UseGuards(AuthGuard('jwt'))
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  create(@Body() createUnidadDto: CreateUnidadDto) {
    return this.unidadesService.create(createUnidadDto)
  }

  @Get()
  findAll() {
    return this.unidadesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unidadesService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnidadDto: UpdateUnidadDto,
  ) {
    return this.unidadesService.update(id, updateUnidadDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.unidadesService.remove(id)
  }
}
