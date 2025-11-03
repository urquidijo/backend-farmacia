import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Proveedor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';

type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryProveedoresDto): Promise<ListResponse<Proveedor>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where: Prisma.ProveedorWhereInput | undefined = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { contacto: { contains: search, mode: 'insensitive' } },
            { telefono: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.proveedor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));

    return { items, total, page, pageSize, totalPages };
  }

  async findOne(id: number) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return proveedor;
  }

  async create(dto: CreateProveedorDto) {
    const data: Prisma.ProveedorUncheckedCreateInput = {
      nombre: dto.nombre.trim(),
      contacto: dto.contacto?.trim(),
      telefono: dto.telefono?.trim(),
      email: dto.email?.trim(),
      direccion: dto.direccion?.trim(),
      notas: dto.notas?.trim(),
    };
    return this.prisma.proveedor.create({ data });
  }

  async update(id: number, dto: UpdateProveedorDto) {
    await this.ensureExists(id);
    const data: Prisma.ProveedorUncheckedUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.contacto !== undefined) data.contacto = dto.contacto?.trim();
    if (dto.telefono !== undefined) data.telefono = dto.telefono?.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim();
    if (dto.direccion !== undefined) data.direccion = dto.direccion?.trim();
    if (dto.notas !== undefined) data.notas = dto.notas?.trim();
    return this.prisma.proveedor.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.proveedor.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.proveedor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Proveedor ${id} no encontrado`);
  }
}
