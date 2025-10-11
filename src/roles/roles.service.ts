// src/roles/roles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll(withPerms = false) {
    return this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: withPerms ? { permissions: { include: { permission: true } } } : undefined,
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    return this.prisma.role.create({ data: dto });
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.ensureRole(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.ensureRole(id);
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    return this.prisma.role.delete({ where: { id } });
  }

  async getPermissions(id: number) {
    await this.ensureRole(id);
    const rp = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
      orderBy: { permissionId: 'asc' },
    });
    return rp.map(r => r.permission);
  }

  async setPermissions(id: number, permissionIds: number[]) {
    await this.ensureRole(id);

    // Asegurar que los permisos existan
    const found = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map(p => p.id));

    // Reemplazo total (clear + createMany)
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: [...foundIds].map(pid => ({ roleId: id, permissionId: pid })),
        skipDuplicates: true,
      }),
    ]);

    return this.getPermissions(id);
  }

  private async ensureRole(id: number) {
    const exists = await this.prisma.role.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Role not found');
  }
}
