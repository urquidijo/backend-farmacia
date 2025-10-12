// src/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.permission.findMany({ orderBy: [{ key: 'asc' }, { id: 'asc' }] });
  }
}
