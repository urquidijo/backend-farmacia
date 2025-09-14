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
      data: createProductoDto,
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
    })
  }

  async findAll() {
    return this.prisma.producto.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
    })
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
    })

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`)
    }

    return producto
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
      data: updateProductoDto,
      include: {
        marca: true,
        categoria: true,
        unidad: true,
      },
    })
  }

  async remove(id: number) {
    try {
      return await this.prisma.producto.delete({
        where: { id },
      })
    } catch (error) {
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
}