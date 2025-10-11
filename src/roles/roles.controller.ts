// src/roles/roles.controller.ts
import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  findAll(@Query('withPerms', new DefaultValuePipe('false')) withPerms: string) {
    return this.roles.findAll(withPerms === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roles.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roles.remove(id);
  }

  @Get(':id/permissions')
  getPerms(@Param('id', ParseIntPipe) id: number) {
    return this.roles.getPermissions(id);
  }

  @Put(':id/permissions')
  setPerms(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRolePermissionsDto) {
    return this.roles.setPermissions(id, body.permissionIds);
  }
}
