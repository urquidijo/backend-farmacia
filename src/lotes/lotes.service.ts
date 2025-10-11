import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLoteDto } from './dto/create-lote.dto'
import { UpdateLoteDto } from './dto/update-lote.dto'
import { AlertsService } from '../alerts/alerts.service'

@Injectable()
export class LotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  findByProducto(productoId: number) {
    return this.prisma.lote.findMany({
      where: { productoId },
      orderBy: { fechaVenc: 'asc' },
    })
  }

  async create(productoId: number, dto: CreateLoteDto) {
    const lote = await this.prisma.$transaction(async tx => {
      await this.ensureProductoExists(tx, productoId)

      const created = await tx.lote.create({
        data: {
          productoId,
          codigo: dto.codigo?.trim() || undefined,
          cantidad: dto.cantidad,
          fechaVenc: dto.fechaVenc,
        },
      })

      await this.recalculateProductoStock(tx, productoId)

      return created
    })

    await this.alertsService.syncAllAlerts({ source: 'inventory' })
    return lote
  }

  async update(loteId: number, dto: UpdateLoteDto) {
    const lote = await this.prisma.lote.findUnique({ where: { id: loteId } })
    if (!lote) {
      throw new NotFoundException('Lote no encontrado')
    }

    const updated = await this.prisma.$transaction(async tx => {
      const data: Prisma.LoteUpdateInput = {}
      if (dto.codigo !== undefined) {
        data.codigo = dto.codigo?.trim() || null
      }
      if (dto.cantidad !== undefined) {
        if (dto.cantidad < 0) {
          throw new BadRequestException('La cantidad no puede ser negativa')
        }
        data.cantidad = dto.cantidad
      }
      if (dto.fechaVenc !== undefined) {
        data.fechaVenc = dto.fechaVenc
      }

      const result = await tx.lote.update({
        where: { id: loteId },
        data,
      })

      await this.recalculateProductoStock(tx, lote.productoId)
      return result
    })

    await this.alertsService.syncAllAlerts({ source: 'inventory' })
    return updated
  }

  async remove(loteId: number) {
    const lote = await this.prisma.lote.findUnique({ where: { id: loteId } })
    if (!lote) {
      throw new NotFoundException('Lote no encontrado')
    }

    await this.prisma.$transaction(async tx => {
      await tx.lote.delete({ where: { id: loteId } })
      await this.recalculateProductoStock(tx, lote.productoId)
    })

    await this.alertsService.syncAllAlerts({ source: 'inventory' })
    return { message: 'Lote eliminado' }
  }

  private async ensureProductoExists(
    tx: Prisma.TransactionClient,
    productoId: number,
  ) {
    const producto = await tx.producto.findUnique({ where: { id: productoId } })
    if (!producto) {
      throw new NotFoundException('Producto no encontrado')
    }
  }

  private async recalculateProductoStock(
    tx: Prisma.TransactionClient,
    productoId: number,
  ) {
    const result = await tx.lote.aggregate({
      where: { productoId },
      _sum: { cantidad: true },
    })
    const total = result._sum.cantidad ?? 0

    await tx.producto.update({
      where: { id: productoId },
      data: { stockActual: total },
    })
    return total
  }
}
