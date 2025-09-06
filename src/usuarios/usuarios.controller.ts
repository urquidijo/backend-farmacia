import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { IdValidationPipe } from 'src/common/pipes/id-validation/id-validation.pipe';
import { LoginDto } from './dto/login.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('/login')
  login(@Body() loginDto: LoginDto) {
    return this.usuariosService.login(loginDto);
  }
  
    @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.createUser(createUsuarioDto);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAllUser();
  }

  @Get(':id')
  findOne(@Param('id',IdValidationPipe) id: string) {
    return this.usuariosService.findOneUser(+id);
  }

  @Put(':id')
  update(@Param('id',IdValidationPipe) id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.updateUser(+id, updateUsuarioDto);
  }

  @Delete(':id')
  remove(@Param('id',IdValidationPipe) id: string) {
    return this.usuariosService.removeUser(+id);
  }
}
