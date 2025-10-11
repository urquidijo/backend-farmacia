// bitacora.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBitacoraDto, EstadoBitacora } from './dto/create-bitacora.dto';
import { QueryBitacoraDto } from './dto/query-bitacora.dto';
import { toZonedTime, format } from 'date-fns-tz';

const LA_PAZ = 'America/La_Paz';

@Injectable()
export class BitacoraService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBitacoraDto) {
    const created = await this.prisma.bitacora.create({
      data: {
        userId: dto.userId,
        ip: dto.ip,
        acciones: dto.acciones,
        estado: dto.estado as EstadoBitacora,
        // Si tu modelo tiene @default(now()) puedes omitir esto:
        createdAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return this.formatToBolivia(created);
  }

  async findAll(q: QueryBitacoraDto) {
    const page = q.page && q.page > 0 ? q.page : 1;
    const perPage = q.perPage && q.perPage > 0 && q.perPage <= 100 ? q.perPage : 20;

    // --- WHERE dinámico
    const where: any = {};

    if (q.userId) where.userId = q.userId;
    if (q.estado) where.estado = q.estado;

    if (q.nombre?.trim()) {
      const term = q.nombre.trim();
      where.user = {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName:  { contains: term, mode: 'insensitive' } },
          { email:     { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    if (q.desde || q.hasta) {
      where.createdAt = {};
      // Si el front envía ISO con offset -04:00 (recomendado), new Date(q.desde) ya queda OK.
      // Aún así, si te envían sólo 'YYYY-MM-DD', puedes convertirlo explícitamente:
      if (q.desde) where.createdAt.gte = new Date(q.desde); // o: zonedTimeToUtc(q.desde, LA_PAZ)
      if (q.hasta) where.createdAt.lte = new Date(q.hasta);
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.bitacora.count({ where }),
      this.prisma.bitacora.findMany({
        where,
        orderBy: { id: 'desc' },               // o { createdAt: 'desc' }
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const mapped = items.map((b) => this.formatToBolivia(b));
    return { total, page, perPage, items: mapped };
  }

  async findOne(id: number) {
    const b = await this.prisma.bitacora.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return b ? this.formatToBolivia(b) : null;
  }

  async remove(id: number) {
    return this.prisma.bitacora.delete({ where: { id } });
  }

  // ---- helpers ----
  private formatToBolivia(entry: any) {
    // createdAt viene en UTC desde DB → lo pasamos a BO + devolvemos campos separados
    const zoned = toZonedTime(entry.createdAt, LA_PAZ);
    const fecha_entrada = format(zoned, 'yyyy-MM-dd', { timeZone: LA_PAZ });
    const hora_entrada  = format(zoned, 'HH:mm:ss',   { timeZone: LA_PAZ });

    const { createdAt, ...rest } = entry;
    return { ...rest, fecha_entrada, hora_entrada };
  }
}
