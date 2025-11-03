import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoOrden, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPedidosDto } from './dto/query-pedidos.dto';

type OrdenWithRelations = Prisma.OrdenGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
    items: {
      include: {
        producto: { select: { id: true; nombre: true; imageUrl: true } };
      };
    };
    pago: true;
  };
}>;

type PedidoItemDto = {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: {
    id: number;
    nombre: string;
    imageUrl: string | null;
  } | null;
};

type PedidoPagoDto = {
  id: number;
  estado: string;
  monto: number;
  metodo: string | null;
  facturaUrl: string | null;
  createdAt: Date;
} | null;

type PedidoDto = {
  id: number;
  estado: EstadoOrden;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: PedidoItemDto[];
  pago: PedidoPagoDto;
};

type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeConfig = {
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
    items: {
      include: {
        producto: { select: { id: true, nombre: true, imageUrl: true } },
      },
    },
    pago: true,
  } as const;

  async list(query: QueryPedidosDto): Promise<ListResponse<PedidoDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const filters: Prisma.OrdenWhereInput[] = [];

    if (query.status) {
      filters.push({ estado: query.status });
    }

    const rangeFilter: Prisma.DateTimeFilter = {};
    if (query.from) {
      const parsed = new Date(query.from);
      if (!Number.isNaN(parsed.getTime())) rangeFilter.gte = parsed;
    }
    if (query.to) {
      const parsed = new Date(query.to);
      if (!Number.isNaN(parsed.getTime())) rangeFilter.lte = parsed;
    }
    if (Object.keys(rangeFilter).length) {
      filters.push({ createdAt: rangeFilter });
    }

    const search = query.search?.trim();
    if (search) {
      const numericId = Number(search);
      const orFilters: Prisma.OrdenWhereInput[] = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { items: { some: { producto: { nombre: { contains: search, mode: 'insensitive' } } } } },
      ];
      if (!Number.isNaN(numericId)) {
        orFilters.push({ id: numericId });
      }
      filters.push({ OR: orFilters });
    }

    const where: Prisma.OrdenWhereInput | undefined = filters.length
      ? { AND: filters }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.orden.findMany({
        where,
        include: this.includeConfig,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.orden.count({ where }),
    ]);

    const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));

    return {
      items: items.map((orden) => this.mapOrden(orden)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async findOne(id: number): Promise<PedidoDto> {
    const orden = await this.prisma.orden.findUnique({
      where: { id },
      include: this.includeConfig,
    });
    if (!orden) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return this.mapOrden(orden);
  }

  async updateStatus(id: number, estado: EstadoOrden) {
    await this.ensureExists(id);
    await this.prisma.orden.update({
      where: { id },
      data: { estado },
    });
    return this.findOne(id);
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.orden.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Pedido ${id} no encontrado`);
  }

  private mapOrden(orden: OrdenWithRelations): PedidoDto {
    return {
      id: orden.id,
      estado: orden.estado,
      total: orden.total.toNumber(),
      createdAt: orden.createdAt,
      updatedAt: orden.updatedAt,
      user: orden.user,
      items: orden.items.map((item) => ({
        id: item.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario.toNumber(),
        subtotal: item.subtotal.toNumber(),
        producto: item.producto
          ? {
              id: item.producto.id,
              nombre: item.producto.nombre,
              imageUrl: item.producto.imageUrl ?? null,
            }
          : null,
      })),
      pago: orden.pago
        ? {
            id: orden.pago.id,
            estado: orden.pago.estado,
            monto: orden.pago.monto,
            metodo: orden.pago.metodo,
            facturaUrl: orden.pago.facturaUrl,
            createdAt: orden.pago.createdAt,
          }
        : null,
    };
  }
}
