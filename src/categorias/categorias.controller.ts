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
import { CategoriasService } from './categorias.service'
import { CreateCategoriaDto } from './dto/create-categoria.dto'
import { UpdateCategoriaDto } from './dto/update-categoria.dto'

@Controller('categorias')
@UseGuards(AuthGuard('jwt'))
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriasService.create(createCategoriaDto)
  }

  @Get()
  findAll() {
    return this.categoriasService.findAll()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(id, updateCategoriaDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.remove(id)
  }
}
