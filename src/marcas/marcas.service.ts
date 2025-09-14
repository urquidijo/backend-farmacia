import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMarcaDto } from './dto/create-marca.dto'
import { UpdateMarcaDto } from './dto/update-marca.dto'

@Injectable()
export class MarcasService {
  constructor(private prisma: PrismaService) {}

  async create(createMarcaDto: CreateMarcaDto) {
    try {
      return await this.prisma.marca.create({
        data: createMarcaDto,
      })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una marca con ese nombre')
      }
      throw error
    }
  }

  async findAll() {
    return this.prisma.marca.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    })
  }

  async findOne(id: number) {
    const marca = await this.prisma.marca.findUnique({
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

    if (!marca) {
      throw new NotFoundException(`Marca con ID ${id} no encontrada`)
    }

    return marca
  }

  async update(id: number, updateMarcaDto: UpdateMarcaDto) {
    try {
      return await this.prisma.marca.update({
        where: { id },
        data: updateMarcaDto,
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Marca con ID ${id} no encontrada`)
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una marca con ese nombre')
      }
      throw error
    }
  }

  async remove(id: number) {
    try {
      // Verificar si tiene productos asociados
      const marca = await this.prisma.marca.findUnique({
        where: { id },
        include: { _count: { select: { productos: true } } }
      })

      if (!marca) {
        throw new NotFoundException(`Marca con ID ${id} no encontrada`)
      }

      if (marca._count.productos > 0) {
        throw new ConflictException('No se puede eliminar la marca porque tiene productos asociados')
      }

      return await this.prisma.marca.delete({
        where: { id },
      })
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Marca con ID ${id} no encontrada`)
      }
      throw error
    }
  }
}