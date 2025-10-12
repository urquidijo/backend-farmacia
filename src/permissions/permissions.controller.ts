// src/permissions/permissions.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}
  @Get()
  findAll() {
    return this.permissions.findAll();
  }
}
