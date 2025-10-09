import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(createClienteDto: CreateClienteDto) {
    // Verificar si ya existe un cliente con ese NIT (si se proporciona)
    if (createClienteDto.nit) {
      const existente = await this.prisma.cliente.findUnique({
        where: { nit: createClienteDto.nit },
      });
      if (existente) {
        throw new ConflictException(`Ya existe un cliente con el NIT: ${createClienteDto.nit}`);
      }
    }

    return this.prisma.cliente.create({
      data: createClienteDto,
    });
  }

  async findAll(params?: { q?: string; page?: number; size?: number; activo?: boolean }) {
    const { q, page = 1, size = 10, activo } = params || {};
    const skip = (page - 1) * size;

    const where: any = {};

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { apellido: { contains: q, mode: 'insensitive' } },
        { nit: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      clientes,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el NIT, verificar que no exista en otro cliente
    if (updateClienteDto.nit) {
      const existente = await this.prisma.cliente.findUnique({
        where: { nit: updateClienteDto.nit },
      });
      if (existente && existente.id !== id) {
        throw new ConflictException(`Ya existe otro cliente con el NIT: ${updateClienteDto.nit}`);
      }
    }

    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  async remove(id: number) {
    // Verificar que existe
    await this.findOne(id);

    return this.prisma.cliente.delete({
      where: { id },
    });
  }
}
