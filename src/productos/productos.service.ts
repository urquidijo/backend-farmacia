import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductoDto } from './dto/create-producto.dto'
import { UpdateProductoDto } from './dto/update-producto.dto'

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async create(createProductoDto: CreateProductoDto) {
    // Verificar que existan las relaciones
    await this.validateRelations(createProductoDto.marcaId, createProductoDto.categoriaId, createProductoDto.unidadId)

    return this.prisma.producto.create({
    data: {
      ...createProductoDto,
      requiereReceta: createProductoDto.requiereReceta ?? false, // <- importante
    },
    include: { marca: true, categoria: true, unidad: true },
  })
}

  async findAll(q?: string, page: number = 1, size: number = 10) {
  const where = q
    ? {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' as const } },
          { descripcion: { contains: q, mode: 'insensitive' as const } },
          { marca: { nombre: { contains: q, mode: 'insensitive' as const } } },
          { categoria: { nombre: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  const [productos, total, ofertasActivas] = await Promise.all([
    this.prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
      skip: (page - 1) * size,
      take: size,
    }),
    this.prisma.producto.count({ where }),
    this.getOfertasActivas(),
  ]);

  const productosConDescuento = productos.map(producto => {
    const descuento = this.calcularMejorDescuento(producto, ofertasActivas);
    return {
      ...producto,
      precio: producto.precio.toNumber(),
      descuento: descuento ? descuento / 100 : null, // Convertir porcentaje a decimal
    };
  });

  return {
    productos: productosConDescuento,
    total,
    page,
    size,
    totalPages: Math.ceil(total / size),
  }
}

  async findOne(id: number) {
  const [producto, ofertasActivas] = await Promise.all([
    this.prisma.producto.findUnique({
      where: { id },
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
    }),
    this.getOfertasActivas(),
  ]);

  if (!producto) {
    throw new NotFoundException(`Producto con ID ${id} no encontrado`);
  }

  const descuento = this.calcularMejorDescuento(producto, ofertasActivas);

  return {
    ...producto,
    precio: producto.precio.toNumber(),
    descuento: descuento ? descuento / 100 : null, // Convertir porcentaje a decimal
  };
}

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    // Verificar que el producto existe
    const existingProduct = await this.prisma.producto.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`)
    }

    // Verificar relaciones si se están actualizando
    if (updateProductoDto.marcaId || updateProductoDto.categoriaId || updateProductoDto.unidadId) {
      await this.validateRelations(
        updateProductoDto.marcaId || existingProduct.marcaId,
        updateProductoDto.categoriaId || existingProduct.categoriaId,
        updateProductoDto.unidadId || existingProduct.unidadId
      )
    }

     return this.prisma.producto.update({
    where: { id },
    data: {
      ...updateProductoDto, // incluye requiereReceta si vino en el body
    },
    include: { marca: true, categoria: true, unidad: true },
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

        return tx.producto.delete({
          where: { id },
        })
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`)
      }
      throw error
    }
  }

  private async validateRelations(marcaId: number, categoriaId: number, unidadId: number) {
    const [marca, categoria, unidad] = await Promise.all([
      this.prisma.marca.findUnique({ where: { id: marcaId } }),
      this.prisma.categoria.findUnique({ where: { id: categoriaId } }),
      this.prisma.unidad.findUnique({ where: { id: unidadId } }),
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
  }

  private async getOfertasActivas() {
    const now = new Date();
    const ofertas = await this.prisma.oferta.findMany({
      where: {
        activa: true,
        fechaInicio: { lte: now },
        fechaFin: { gte: now }
      },
      include: {
        ofertaProductos: {
          select: { productoId: true }
        },
        ofertaCategorias: {
          select: { categoriaId: true }
        },
        ofertaMarcas: {
          select: { marcaId: true }
        }
      }
    });

    // Filtramos las ofertas que han alcanzado su máximo de usos
    return ofertas.filter(oferta => 
      oferta.maxUsos === null || oferta.usosActuales < oferta.maxUsos
    );
  }

private calcularMejorDescuento(producto: any, ofertas: any[]): number | null {
    let mejorDescuento = null;
    
    for (const oferta of ofertas) {
      // Verificar si el producto está directamente en la oferta
      const tieneProductoDirecto = oferta.ofertaProductos.some(
        (op: any) => op.productoId === producto.id
      );

      // Verificar si la categoría del producto está en la oferta
      const tieneCategoriaOferta = oferta.ofertaCategorias.some(
        (oc: any) => oc.categoriaId === producto.categoriaId
      );

      // Verificar si la marca del producto está en la oferta
      const tieneMarcaOferta = oferta.ofertaMarcas.some(
        (om: any) => om.marcaId === producto.marcaId
      );

      if (tieneProductoDirecto || tieneCategoriaOferta || tieneMarcaOferta) {
        // Si no hay descuento previo o este descuento es mejor, actualizamos
        if (mejorDescuento === null || oferta.valorDescuento > mejorDescuento) {
          mejorDescuento = oferta.valorDescuento;
        }
      }
    }

    return mejorDescuento;
  }

}
