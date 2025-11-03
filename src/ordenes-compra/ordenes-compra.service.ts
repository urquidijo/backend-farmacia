import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, EstadoOrdenCompra } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { UpdateOrdenCompraEstadoDto } from './dto/update-orden-compra-estado.dto';
import { QueryOrdenesCompraDto } from './dto/query-ordenes-compra.dto';
import { AddOrdenCompraItemDto } from './dto/add-orden-compra-item.dto';
import { UpdateOrdenCompraItemDto } from './dto/update-orden-compra-item.dto';

const ORDEN_COMPRA_INCLUDE = {
  proveedor: {
    select: {
      id: true,
      nombre: true,
      contacto: true,
      telefono: true,
      email: true,
      direccion: true,
      notas: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  items: {
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
          proveedorId: true,
        },
      },
    },
  },
} as const;

type OrdenCompraWithRelations = Prisma.OrdenCompraGetPayload<{
  include: typeof ORDEN_COMPRA_INCLUDE;
}>;

type OrdenCompraSerialized = Omit<
  OrdenCompraWithRelations,
  'totalEstimado' | 'items'
> & {
  totalEstimado: number | null;
  items: Array<
    Omit<
      OrdenCompraWithRelations['items'][number],
      'costoUnitario' | 'subtotal'
    > & {
      costoUnitario: number | null;
      subtotal: number | null;
    }
  >;
};

const ESTADOS_CERRADOS = new Set<EstadoOrdenCompra>([
  EstadoOrdenCompra.CERRADA,
  EstadoOrdenCompra.CANCELADA,
]);

@Injectable()
export class OrdenesCompraService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeConfig = ORDEN_COMPRA_INCLUDE;

  async create(dto: CreateOrdenCompraDto) {
    await this.ensureProveedorExists(dto.proveedorId);
    const itemsData = await Promise.all(
      dto.items.map((item) => this.mapItemInput(dto.proveedorId, item)),
    );

    const total = this.calculateTotal(itemsData);

    const orden = (await this.prisma.ordenCompra.create({
      data: {
        proveedorId: dto.proveedorId,
        notas: dto.notas,
        totalEstimado: total,
        items: {
          create: itemsData,
        },
      },
      include: this.includeConfig,
    })) as OrdenCompraWithRelations;

    return this.serialize(orden);
  }

  async findAll(query: QueryOrdenesCompraDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0
        ? Math.min(query.pageSize, 100)
        : 20;
    const skip = (page - 1) * pageSize;

    const filters: Prisma.OrdenCompraWhereInput[] = [];

    if (query.estado) filters.push({ estado: query.estado });
    if (query.proveedorId)
      filters.push({ proveedorId: Number(query.proveedorId) });

    if (query.search?.trim()) {
      const term = query.search.trim();
      filters.push({
        OR: [
          { notas: { contains: term, mode: 'insensitive' } },
          { proveedor: { nombre: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.desde || query.hasta) {
      const range: Prisma.DateTimeFilter = {};
      if (query.desde) range.gte = new Date(query.desde);
      if (query.hasta) range.lte = new Date(query.hasta);
      filters.push({ fechaCreacion: range });
    }

    const where =
      filters.length > 0
        ? {
            AND: filters,
          }
        : undefined;

    const [total, ordenesRaw] = (await this.prisma.$transaction([
      this.prisma.ordenCompra.count({ where }),
      this.prisma.ordenCompra.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        skip,
        take: pageSize,
        include: this.includeConfig,
      }),
    ])) as [number, OrdenCompraWithRelations[]];

    return {
      total,
      page,
      pageSize,
      items: ordenesRaw.map((o) => this.serialize(o)),
    };
  }

  async findOne(id: number) {
    const orden = (await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: this.includeConfig,
    })) as OrdenCompraWithRelations | null;
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    return this.serialize(orden);
  }

  async update(id: number, dto: UpdateOrdenCompraDto) {
    await this.ensureExists(id);
    const data: Prisma.OrdenCompraUpdateInput = {};

    if (dto.notas !== undefined) data.notas = dto.notas;
    if (dto.fechaEnvio !== undefined)
      data.fechaEnvio = dto.fechaEnvio ? new Date(dto.fechaEnvio) : null;
    if (dto.fechaRecepcion !== undefined)
      data.fechaRecepcion = dto.fechaRecepcion
        ? new Date(dto.fechaRecepcion)
        : null;
    if (dto.totalEstimado !== undefined)
      data.totalEstimado = dto.totalEstimado;

    const orden = (await this.prisma.ordenCompra.update({
      where: { id },
      data,
      include: this.includeConfig,
    })) as OrdenCompraWithRelations;
    return this.serialize(orden);
  }

  async updateEstado(id: number, dto: UpdateOrdenCompraEstadoDto) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');

    if (orden.estado === dto.estado) {
      return this.findOne(id);
    }

    const updated = (await this.prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: dto.estado,
        fechaEnvio:
          dto.estado === EstadoOrdenCompra.ENVIADA
            ? new Date()
            : undefined,
        fechaRecepcion:
          dto.estado === EstadoOrdenCompra.RECIBIDA ||
          dto.estado === EstadoOrdenCompra.CERRADA
            ? new Date()
            : undefined,
      },
      include: this.includeConfig,
    })) as OrdenCompraWithRelations;

    return this.serialize(updated);
  }

  async remove(id: number) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (orden.estado !== EstadoOrdenCompra.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden eliminar ordenes en estado BORRADOR',
      );
    }
    await this.prisma.ordenCompra.delete({ where: { id } });
    return { success: true };
  }

  async addItem(ordenId: number, dto: AddOrdenCompraItemDto) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenId },
      select: { proveedorId: true, estado: true },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (ESTADOS_CERRADOS.has(orden.estado)) {
      throw new BadRequestException(
        'No se pueden modificar ordenes cerradas o canceladas',
      );
    }

    const itemData = await this.mapItemInput(orden.proveedorId, dto);

    const existing = await this.prisma.ordenCompraItem.findUnique({
      where: {
        ordenCompraId_productoId: {
          ordenCompraId: ordenId,
          productoId: dto.productoId,
        },
      },
    });

    if (existing) {
      const nextCosto =
        dto.costoUnitario !== undefined
          ? dto.costoUnitario
          : existing.costoUnitario !== null && existing.costoUnitario !== undefined
          ? Number(existing.costoUnitario)
          : undefined;
      await this.prisma.ordenCompraItem.update({
        where: { id: existing.id },
        data: {
          cantidadSolic: existing.cantidadSolic + dto.cantidad,
          costoUnitario: nextCosto,
          subtotal: this.calculateSubtotal(
            existing.cantidadSolic + dto.cantidad,
            nextCosto,
          ),
          notas: dto.notas ?? existing.notas,
        },
      });
    } else {
      await this.prisma.ordenCompraItem.create({
        data: {
          ...itemData,
          orden: { connect: { id: ordenId } },
        },
      });
    }

    await this.recalculateTotal(ordenId);
    return this.findOne(ordenId);
  }

  async updateItem(
    ordenId: number,
    itemId: number,
    dto: UpdateOrdenCompraItemDto,
  ) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenId },
      select: { proveedorId: true, estado: true },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (ESTADOS_CERRADOS.has(orden.estado)) {
      throw new BadRequestException(
        'No se pueden modificar ordenes cerradas o canceladas',
      );
    }

    const item = await this.prisma.ordenCompraItem.findUnique({
      where: { id: itemId },
      include: { orden: true },
    });
    if (!item || item.ordenCompraId !== ordenId) {
      throw new NotFoundException('Item de orden de compra no encontrado');
    }

    const cantidad =
      dto.cantidadSolic !== undefined
        ? dto.cantidadSolic
        : item.cantidadSolic;
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }

    const costo =
      dto.costoUnitario !== undefined
        ? dto.costoUnitario
        : item.costoUnitario !== null && item.costoUnitario !== undefined
        ? Number(item.costoUnitario)
        : undefined;

    await this.prisma.ordenCompraItem.update({
      where: { id: itemId },
      data: {
        cantidadSolic: dto.cantidadSolic ?? item.cantidadSolic,
        cantidadRecib: dto.cantidadRecib ?? item.cantidadRecib,
        costoUnitario: costo,
        subtotal: this.calculateSubtotal(cantidad, costo),
        notas: dto.notas ?? item.notas,
      },
    });

    await this.recalculateTotal(ordenId);
    return this.findOne(ordenId);
  }

  async removeItem(ordenId: number, itemId: number) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenId },
      select: { estado: true },
    });
    if (!orden) throw new NotFoundException('Orden de compra no encontrada');
    if (ESTADOS_CERRADOS.has(orden.estado)) {
      throw new BadRequestException(
        'No se pueden modificar ordenes cerradas o canceladas',
      );
    }

    await this.prisma.ordenCompraItem.delete({
      where: { id: itemId },
    });
    await this.recalculateTotal(ordenId);
    return this.findOne(ordenId);
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.ordenCompra.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Orden de compra no encontrada');
  }

  private async ensureProveedorExists(proveedorId: number) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  private async mapItemInput(
    proveedorId: number,
    item: { productoId: number; cantidad: number; costoUnitario?: number; notas?: string },
  ): Promise<Prisma.OrdenCompraItemCreateWithoutOrdenInput> {
    const producto = await this.prisma.producto.findUnique({
      where: { id: item.productoId },
      select: { id: true, proveedorId: true, nombre: true },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto ${item.productoId} no encontrado`,
      );
    }

    if (producto.proveedorId && producto.proveedorId !== proveedorId) {
      throw new BadRequestException(
        `El producto ${producto.nombre} pertenece a otro proveedor`,
      );
    }

    const subtotal = this.calculateSubtotal(
      item.cantidad,
      item.costoUnitario,
    );

    return {
      producto: { connect: { id: item.productoId } },
      cantidadSolic: item.cantidad,
      costoUnitario: item.costoUnitario,
      subtotal,
      notas: item.notas,
    };
  }

  private calculateSubtotal(
    cantidad: number,
    costoUnitario?: number,
  ): Prisma.Decimal | null {
    if (costoUnitario === undefined) return null;
    const value = cantidad * costoUnitario;
    return new Prisma.Decimal(value);
  }

  private calculateTotal(
    items: Prisma.OrdenCompraItemCreateWithoutOrdenInput[],
  ): Prisma.Decimal | null {
    let total = 0;
    let hasSubtotal = false;
    for (const item of items) {
      if (item.subtotal) {
        total += Number(item.subtotal);
        hasSubtotal = true;
      }
    }
    return hasSubtotal ? new Prisma.Decimal(total) : null;
  }

  private async recalculateTotal(ordenId: number) {
    const items = await this.prisma.ordenCompraItem.findMany({
      where: { ordenCompraId: ordenId },
      select: { cantidadSolic: true, costoUnitario: true },
    });
    let total = 0;
    let hasSubtotal = false;
    for (const item of items) {
      if (item.costoUnitario !== null && item.costoUnitario !== undefined) {
        total += item.cantidadSolic * Number(item.costoUnitario);
        hasSubtotal = true;
      }
    }
    await this.prisma.ordenCompra.update({
      where: { id: ordenId },
      data: {
        totalEstimado: hasSubtotal ? new Prisma.Decimal(total) : null,
      },
    });
  }

  private serialize(orden: OrdenCompraWithRelations): OrdenCompraSerialized {
    return {
      ...orden,
      totalEstimado: orden.totalEstimado ? Number(orden.totalEstimado) : null,
      items: orden.items.map((item) => ({
        ...item,
        costoUnitario:
          item.costoUnitario !== null && item.costoUnitario !== undefined
            ? Number(item.costoUnitario)
            : null,
        subtotal:
          item.subtotal !== null && item.subtotal !== undefined
            ? Number(item.subtotal)
            : null,
      })),
    };
  }
}
