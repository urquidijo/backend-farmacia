import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUnidadDto } from './dto/create-unidad.dto'
import { UpdateUnidadDto } from './dto/update-unidad.dto'

@Injectable()
export class UnidadesService {
  constructor(private prisma: PrismaService) {}

  async create(createUnidadDto: CreateUnidadDto) {
    try {
      return await this.prisma.unidad.create({
        data: createUnidadDto,
      })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una unidad con ese código')
      }
      throw error
    }
  }

  async findAll() {
    return this.prisma.unidad.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    })
  }

  async findOne(id: number) {
    const unidad = await this.prisma.unidad.findUnique({
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

    if (!unidad) {
      throw new NotFoundException(`Unidad con ID ${id} no encontrada`)
    }

    return unidad
  }

  async update(id: number, updateUnidadDto: UpdateUnidadDto) {
    try {
      return await this.prisma.unidad.update({
        where: { id },
        data: updateUnidadDto,
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Unidad con ID ${id} no encontrada`)
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una unidad con ese código')
      }
      throw error
    }
  }

  async remove(id: number) {
    try {
      // Verificar si tiene productos asociados
      const unidad = await this.prisma.unidad.findUnique({
        where: { id },
        include: { _count: { select: { productos: true } } }
      })

      if (!unidad) {
        throw new NotFoundException(`Unidad con ID ${id} no encontrada`)
      }

      if (unidad._count.productos > 0) {
        throw new ConflictException('No se puede eliminar la unidad porque tiene productos asociados')
      }

      return await this.prisma.unidad.delete({
        where: { id },
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Unidad con ID ${id} no encontrada`)
      }
      throw error
    }
  }
}