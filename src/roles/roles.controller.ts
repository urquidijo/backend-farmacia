import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions('user.read')
  findAll() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    })
  }
}