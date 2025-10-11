import { CreateUserDto } from './dto/create-usuario.dto';
import { UpdateUserDto } from './dto/update-usuario.dto';
import { FilterClientesByDateDto } from './dto/filter-clientes-by-date.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, ParseIntPipe, Query } from '@nestjs/common'
import { UsersService } from './usuarios.service'

import { Permissions } from '../auth/decorators/permissions.decorator'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { AuthGuard } from '@nestjs/passport'

@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Permissions('user.read')
  findAll() { return this.users.findAll() }

  @Post('internal')
  @Permissions('user.create')
  create(@Body() dto: CreateUserDto) { return this.users.create(dto) }

  @Patch(':id')
  @Permissions('user.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto)
  }

  @Delete(':id')
  @Permissions('user.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id)
  }

  @Get('clientes')
  @Permissions('user.read')
  findClientes() {
    return this.users.findClientes()
  }

  @Get('clientes/by-date-range')
  @Permissions('user.read')
  findClientesByDateRange(@Query() dto: FilterClientesByDateDto) {
    return this.users.findClientesByDateRange(dto)
  }
}
