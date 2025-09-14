import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoriaDto } from './dto/create-categoria.dto'
import { UpdateCategoriaDto } from './dto/update-categoria.dto'

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoriaDto: CreateCategoriaDto) {
    try {
      return await this.prisma.categoria.create({
        data: createCategoriaDto,
      })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una categoría con ese nombre')
      }
      throw error
    }
  }

  async findAll() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    })
  }

  async findOne(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: {
        productos: {
          select: {
            id: true,
            nombre: true,
            activo: true
          }
        }
      }
    })

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`)
    }

    return categoria
  }

  async update(id: number, updateCategoriaDto: UpdateCategoriaDto) {
    try {
      return await this.prisma.categoria.update({
        where: { id },
        data: updateCategoriaDto,
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`)
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una categoría con ese nombre')
      }
      throw error
    }
  }

  async remove(id: number) {
    try {
      // Verificar si tiene productos asociados
      const categoria = await this.prisma.categoria.findUnique({
        where: { id },
        include: { _count: { select: { productos: true } } }
      })

      if (!categoria) {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`)
      }

      if (categoria._count.productos > 0) {
        throw new ConflictException('No se puede eliminar la categoría porque tiene productos asociados')
      }

      return await this.prisma.categoria.delete({
        where: { id },
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Categoría con ID ${id} no encontrada`)
      }
      throw error
    }
  }
}