import { Body, Controller, Post, Get, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicRegisterDto } from './dto/public-register.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Body() dto: PublicRegisterDto) {
    // asegura rol CLIENTE
    let cliente = await this.prisma.role.findUnique({ where: { name: 'CLIENTE' } });
    if (!cliente) {
      cliente = await this.prisma.role.create({
        data: { name: 'CLIENTE', description: 'Cliente e-commerce' },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          telefono: dto.telefono,
          passwordHash,
          roles: {
            create: [{ roleId: cliente.id }], // asigna rol CLIENTE
          },
        },
        select: { id: true, email: true },
      });
      // No inicia sesión aquí (tu UI redirige a /login)
      return { message: 'registered', user };
    } catch (e) {
      // Email duplicado
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return new Response('Email ya registrado', { status: 409 }) as any;
      }
      throw e;
    }
  }

  @Get('productos')
  async getProductos(
    @Query('categoria') categoria?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 20;

    const where: any = { activo: true };

    if (categoria) {
      where.categoria = { nombre: { contains: categoria, mode: 'insensitive' } };
    }

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { marca: { nombre: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const productos = await this.prisma.producto.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: {
        marca: { select: { nombre: true } },
        categoria: { select: { nombre: true } },
      },
      take: limitNum,
    });

    // Convertir Decimal a número para enviar al frontend
    return productos.map((p) => ({
      ...p,
      precio:
        (p.precio as unknown as Prisma.Decimal).toNumber?.() ??
        Number(p.precio),
    }));
  }

  @Get('categorias')
  async getCategorias() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  /** ========= NUEVO: resolver productos por array de IDs (para recomendaciones) ========= */
  @Post('productos/by-ids')
  async getProductosByIds(@Body('ids') ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids must be a non-empty array');
    }

    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids }, activo: true },
      include: {
        marca: { select: { nombre: true } },
        categoria: { select: { nombre: true } },
      },
    });

    // map id -> producto (con precio como number)
    const map = new Map<number, any>(
      productos.map((p) => [
        p.id,
        {
          ...p,
          precio:
            (p.precio as unknown as Prisma.Decimal).toNumber?.() ??
            Number(p.precio),
        },
      ]),
    );

    // devolver en el mismo orden que 'ids' (descarta ids inexistentes/inactivos)
    const ordered = ids
      .map((id) => map.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    return ordered;
  }
}
