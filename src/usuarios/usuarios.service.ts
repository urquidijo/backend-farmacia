import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from './dto/create-usuario.dto'
import { UpdateUserDto } from './dto/update-usuario.dto'
import { FilterClientesByDateDto } from './dto/filter-clientes-by-date.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telefono: dto.telefono,
        passwordHash,
        roles: dto.roleId ? { create: [{ roleId: dto.roleId }] } : undefined,
      },
      select: { id: true, email: true, firstName: true, lastName: true, telefono: true },
    })
    return user
  }

  async findAll() {
    // mostramos 1er rol si existe (puedes permitir múltiples)
    const users = await this.prisma.user.findMany({
      select: {
        id: true, email: true, firstName: true, lastName: true, telefono: true, status: true,
        roles: { include: { role: true } },
      },
      orderBy: { id: 'asc' },
    })
    return users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      telefono: u.telefono,
      status: u.status,
      role: u.roles[0]?.role ?? null,
    }))
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Usuario no existe')

    const data: any = {}
    if (dto.firstName !== undefined) data.firstName = dto.firstName
    if (dto.lastName !== undefined) data.lastName = dto.lastName
    if (dto.telefono !== undefined) data.telefono = dto.telefono
    if (dto.status !== undefined) data.status = dto.status
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10)

    const updated = await this.prisma.$transaction(async tx => {
      const u = await tx.user.update({ where: { id }, data, select: { id: true } })
      if (dto.roleId !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } })
        await tx.userRole.create({ data: { userId: id, roleId: dto.roleId } })
      }
      return u
    })

    return this.prisma.user.findUnique({
      where: { id: updated.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, telefono: true, status: true,
        roles: { include: { role: true } },
      },
    })
  }

  async remove(id: number) {
    await this.prisma.userRole.deleteMany({ where: { userId: id } })
    return this.prisma.user.delete({ where: { id } })
  }

  async findClientes() {
    // Buscar usuarios que tengan el rol CLIENTE
    const users = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'CLIENTE'
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      telefono: u.telefono,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      role: u.roles[0]?.role ?? null
    }))
  }

  async findClientesByDateRange(dto: FilterClientesByDateDto) {
    const { fechaInicial, fechaFinal } = dto
    
    // Convertir las fechas a objetos Date
    const startDate = new Date(fechaInicial)
    const endDate = new Date(fechaFinal)
    
    // Asegurar que endDate incluya todo el día final
    endDate.setHours(23, 59, 59, 999)

    // Buscar usuarios con rol CLIENTE creados en el rango de fechas
    const users = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'CLIENTE'
            }
          }
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        telefono: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return {
      clientes: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        telefono: u.telefono,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        role: u.roles[0]?.role ?? null
      })),
      total: users.length,
      fechaInicial: startDate,
      fechaFinal: endDate
    }
  }
}
