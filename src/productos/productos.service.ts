import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductoDto } from './dto/create-producto.dto'
import { UpdateProductoDto } from './dto/update-producto.dto'

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto) {
    await this.validateRelations(
      createProductoDto.marcaId,
      createProductoDto.categoriaId,
      createProductoDto.unidadId,
      createProductoDto.proveedorId ?? undefined,
    )

    return this.prisma.producto.create({
      data: {
        ...createProductoDto,
        requiereReceta: createProductoDto.requiereReceta ?? false,
      },
      include: { marca: true, categoria: true, unidad: true, proveedor: true },
    })
  }

  async findAll(q?: string, page = 1, size = 10, proveedorId?: number) {
    const where: Prisma.ProductoWhereInput = {}

    if (q?.trim()) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' as const } },
        { descripcion: { contains: q, mode: 'insensitive' as const } },
        { marca: { nombre: { contains: q, mode: 'insensitive' as const } } },
        { categoria: { nombre: { contains: q, mode: 'insensitive' as const } } },
        { proveedor: { nombre: { contains: q, mode: 'insensitive' as const } } },
      ]
    }

    if (proveedorId) {
      where.proveedorId = proveedorId
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        orderBy: { nombre: 'asc' },
        include: {
          marca: true,
          categoria: true,
          unidad: true,
          proveedor: true,
        },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.producto.count({ where }),
    ])

    return {
      productos: productos.map((p) => ({
        ...p,
        precio: p.precio.toNumber(),
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    }
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        marca: true,
        categoria: true,
        unidad: true,
        proveedor: true,
      },
    })

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`)
    }

    return {
      ...producto,
      precio: producto.precio.toNumber(),
    }
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    const existing = await this.prisma.producto.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`)
    }

    if (
      updateProductoDto.marcaId ||
      updateProductoDto.categoriaId ||
      updateProductoDto.unidadId ||
      Object.prototype.hasOwnProperty.call(updateProductoDto, 'proveedorId')
    ) {
      await this.validateRelations(
        updateProductoDto.marcaId ?? existing.marcaId,
        updateProductoDto.categoriaId ?? existing.categoriaId,
        updateProductoDto.unidadId ?? existing.unidadId,
        Object.prototype.hasOwnProperty.call(updateProductoDto, 'proveedorId')
          ? updateProductoDto.proveedorId ?? undefined
          : existing.proveedorId ?? undefined,
      )
    }

    return this.prisma.producto.update({
      where: { id },
      data: {
        ...updateProductoDto,
      },
      include: { marca: true, categoria: true, unidad: true, proveedor: true },
    })
  }

  async remove(id: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lotes = await tx.lote.findMany({
          where: { productoId: id },
          select: { id: true },
        })
        const loteIds = lotes.map((l) => l.id)

        if (loteIds.length) {
          await tx.alert.deleteMany({
            where: {
              OR: [{ productoId: id }, { loteId: { in: loteIds } }],
            },
          })
        } else {
          await tx.alert.deleteMany({ where: { productoId: id } })
        }

        await tx.ordenItem.deleteMany({ where: { productoId: id } })
        await tx.carritoItem.deleteMany({ where: { productoId: id } })

        return tx.producto.delete({ where: { id } })
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`)
      }
      throw error
    }
  }

  private async validateRelations(
    marcaId: number,
    categoriaId: number,
    unidadId: number,
    proveedorId?: number,
  ) {
    const [marca, categoria, unidad, proveedor] = await Promise.all([
      this.prisma.marca.findUnique({ where: { id: marcaId } }),
      this.prisma.categoria.findUnique({ where: { id: categoriaId } }),
      this.prisma.unidad.findUnique({ where: { id: unidadId } }),
      typeof proveedorId === 'number'
        ? this.prisma.proveedor.findUnique({ where: { id: proveedorId } })
        : Promise.resolve(null),
    ])

    if (!marca) {
      throw new BadRequestException(`Marca con ID ${marcaId} no existe`)
    }
    if (!categoria) {
      throw new BadRequestException(`Categoría con ID ${categoriaId} no existe`)
    }
    if (!unidad) {
      throw new BadRequestException(`Unidad con ID ${unidadId} no existe`)
    }
    if (typeof proveedorId === 'number' && !proveedor) {
      throw new BadRequestException(`Proveedor con ID ${proveedorId} no existe`)
    }
  }
}
