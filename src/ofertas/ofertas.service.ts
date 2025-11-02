import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';

@Injectable()
export class OfertasService {
  constructor(private prisma: PrismaService) {}

  async create(createOfertaDto: CreateOfertaDto) {
    try {
      const { productos, categorias, marcas, ...ofertaData } = createOfertaDto;

      // Validar que al menos haya un tipo de asociación
      if (!productos?.length && !categorias?.length && !marcas?.length) {
        throw new BadRequestException(
          'La oferta debe estar asociada a al menos un producto, categoría o marca',
        );
      }

      // Validar que maxUsos sea mayor que 0 si se proporciona
      if (ofertaData.maxUsos !== undefined && ofertaData.maxUsos <= 0) {
        throw new BadRequestException('maxUsos debe ser mayor que 0');
      }

      return await this.prisma.oferta.create({
        data: {
          ...ofertaData,
          productos: productos
            ? {
                create: productos.map((p) => ({ productoId: p.productoId })),
              }
            : undefined,
          categorias: categorias
            ? {
                create: categorias.map((c) => ({ categoriaId: c.categoriaId })),
              }
            : undefined,
          marcas: marcas
            ? {
                create: marcas.map((m) => ({ marcaId: m.marcaId })),
              }
            : undefined,
        },
        include: {
          ofertaProductos: {
            include: { producto: { select: { id: true, nombre: true } } },
          },
          ofertaCategorias: {
            include: {
              categoria: { select: { id: true, nombre: true } },
            },
          },
          ofertaMarcas: {
            include: { marca: { select: { id: true, nombre: true } } },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una oferta con ese nombre');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.oferta.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            ofertaProductos: true,
            ofertaCategorias: true,
            ofertaMarcas: true,
          },
        },
      },
    });
  }

  async findActivas() {
    const now = new Date();
    const ofertas = await this.prisma.oferta.findMany({
      where: {
        activa: true,
        fechaInicio: { lte: now },
        fechaFin: { gte: now },
      },
      orderBy: { fechaInicio: 'desc' },
      include: {
        ofertaProductos: {
          include: { producto: { select: { id: true, nombre: true } } },
        },
        ofertaCategorias: {
          include: {
            categoria: { select: { id: true, nombre: true } },
          },
        },
        ofertaMarcas: {
          include: { marca: { select: { id: true, nombre: true } } },
        },
      },
    });

    // Filtrar ofertas que no excedan el límite de usos
    return ofertas.filter(
      (oferta) => !oferta.maxUsos || oferta.usosActuales < oferta.maxUsos,
    );
  }

  async findOne(id: number) {
    const oferta = await this.prisma.oferta.findUnique({
      where: { id },
      include: {
        ofertaProductos: {
          include: { producto: { select: { id: true, nombre: true } } },
        },
        ofertaCategorias: {
          include: {
            categoria: { select: { id: true, nombre: true } },
          },
        },
        ofertaMarcas: {
          include: { marca: { select: { id: true, nombre: true } } },
        },
      },
    });

    if (!oferta) {
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    }

    return oferta;
  }

  async update(id: number, updateOfertaDto: UpdateOfertaDto) {
    try {
      const { productos, categorias, marcas, ...ofertaData } = updateOfertaDto;

      // Verificar que la oferta existe
      await this.findOne(id);

      // Actualizar la oferta principal
      const updatedOferta = await this.prisma.oferta.update({
        where: { id },
        data: ofertaData,
      });

      // Si se proporcionan relaciones, actualizarlas
      if (productos || categorias || marcas) {
        // Si se proporcionan nuevos arrays, reemplazar las relaciones existentes
        if (productos !== undefined) {
          await this.prisma.ofertaProducto.deleteMany({
            where: { ofertaId: id },
          });
          if (productos.length > 0) {
            await this.prisma.ofertaProducto.createMany({
              data: productos.map((p) => ({
                ofertaId: id,
                productoId: p.productoId,
              })),
            });
          }
        }

        if (categorias !== undefined) {
          await this.prisma.ofertaCategoria.deleteMany({
            where: { ofertaId: id },
          });
          if (categorias.length > 0) {
            await this.prisma.ofertaCategoria.createMany({
              data: categorias.map((c) => ({
                ofertaId: id,
                categoriaId: c.categoriaId,
              })),
            });
          }
        }

        if (marcas !== undefined) {
          await this.prisma.ofertaMarca.deleteMany({
            where: { ofertaId: id },
          });
          if (marcas.length > 0) {
            await this.prisma.ofertaMarca.createMany({
              data: marcas.map((m) => ({
                ofertaId: id,
                marcaId: m.marcaId,
              })),
            });
          }
        }

        // Retornar la oferta actualizada con las relaciones
        return this.findOne(id);
      }

      return updatedOferta;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una oferta con ese nombre');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      return await this.prisma.oferta.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async incrementarUsos(id: number) {
    try {
      const oferta = await this.findOne(id);
      return await this.prisma.oferta.update({
        where: { id },
        data: {
          usosActuales: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}

