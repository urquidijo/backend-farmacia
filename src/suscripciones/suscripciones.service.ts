import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  EstadoSuscripcion,
  FrecuenciaSuscripcion,
  Suscripcion,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSuscripcionDto } from './dto/create-suscripcion.dto'
import { UpdateSuscripcionDto } from './dto/update-suscripcion.dto'

@Injectable()
export class SuscripcionesService {
  private readonly logger = new Logger(SuscripcionesService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Calcula la próxima fecha de entrega basada en la frecuencia
   */
  private calculateNextDate(
    frecuencia: FrecuenciaSuscripcion,
    diasPersonalizado?: number,
    diaSemana?: number,
    diaMes?: number,
    fromDate?: Date,
  ): Date {
    const now = fromDate || new Date()
    const nextDate = new Date(now)

    switch (frecuencia) {
      case FrecuenciaSuscripcion.SEMANAL:
        // Avanzar al próximo día de la semana especificado
        const currentDay = nextDate.getDay()
        const targetDay = diaSemana ?? 0
        let daysToAdd = targetDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7 // Si ya pasó, ir a la próxima semana
        nextDate.setDate(nextDate.getDate() + daysToAdd)
        break

      case FrecuenciaSuscripcion.QUINCENAL:
        nextDate.setDate(nextDate.getDate() + 15)
        break

      case FrecuenciaSuscripcion.MENSUAL:
        // Avanzar al próximo mes en el día especificado
        const targetDayOfMonth = diaMes ?? 1
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextDate.setDate(Math.min(targetDayOfMonth, this.getDaysInMonth(nextDate)))
        break

      case FrecuenciaSuscripcion.PERSONALIZADA:
        const days = diasPersonalizado ?? 30
        nextDate.setDate(nextDate.getDate() + days)
        break
    }

    // Establecer hora a las 6 AM
    nextDate.setHours(6, 0, 0, 0)
    return nextDate
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  /**
   * Crea una nueva suscripción
   */
  async create(userId: number, dto: CreateSuscripcionDto) {
    // Validar que el producto existe y está activo
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
      include: { marca: true, unidad: true },
    })

    if (!producto) {
      throw new NotFoundException('Producto no encontrado')
    }

    if (!producto.activo) {
      throw new BadRequestException('El producto no está disponible')
    }

    // Validar parámetros según frecuencia
    if (dto.frecuencia === FrecuenciaSuscripcion.SEMANAL && dto.diaSemana === undefined) {
      throw new BadRequestException('Debe especificar el día de la semana')
    }

    if (dto.frecuencia === FrecuenciaSuscripcion.MENSUAL && dto.diaMes === undefined) {
      throw new BadRequestException('Debe especificar el día del mes')
    }

    if (dto.frecuencia === FrecuenciaSuscripcion.PERSONALIZADA && !dto.diasPersonalizado) {
      throw new BadRequestException('Debe especificar los días personalizados')
    }

    // Calcular próxima fecha
    const proximaFecha = this.calculateNextDate(
      dto.frecuencia,
      dto.diasPersonalizado,
      dto.diaSemana,
      dto.diaMes,
    )

    // Crear suscripción
    const suscripcion = await this.prisma.suscripcion.create({
      data: {
        userId,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
        frecuencia: dto.frecuencia,
        diasPersonalizado: dto.diasPersonalizado,
        diaSemana: dto.diaSemana,
        diaMes: dto.diaMes,
        proximaFecha,
      },
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
      },
    })

    // Registrar log
    await this.prisma.suscripcionLog.create({
      data: {
        suscripcionId: suscripcion.id,
        accion: 'CREATED',
        resultado: 'SUCCESS',
        mensaje: `Suscripción creada para ${producto.nombre}`,
      },
    })

    this.logger.log(`Suscripción ${suscripcion.id} creada para usuario ${userId}`)

    return suscripcion
  }

  /**
   * Obtiene todas las suscripciones de un usuario
   */
  async findByUser(userId: number, estado?: EstadoSuscripcion) {
    const where: any = { userId }
    if (estado) {
      where.estado = estado
    }

    return this.prisma.suscripcion.findMany({
      where,
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Obtiene una suscripción por ID
   */
  async findOne(userId: number, id: number) {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: { id, userId },
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada')
    }

    return suscripcion
  }

  /**
   * Actualiza una suscripción
   */
  async update(userId: number, id: number, dto: UpdateSuscripcionDto) {
    const suscripcion = await this.findOne(userId, id)

    if (suscripcion.estado === EstadoSuscripcion.CANCELADA) {
      throw new BadRequestException('No se puede modificar una suscripción cancelada')
    }

    // Si cambia la frecuencia, recalcular próxima fecha
    let proximaFecha = suscripcion.proximaFecha
    if (dto.frecuencia && dto.frecuencia !== suscripcion.frecuencia) {
      proximaFecha = this.calculateNextDate(
        dto.frecuencia,
        dto.diasPersonalizado,
        dto.diaSemana,
        dto.diaMes,
      )
    }

    const updated = await this.prisma.suscripcion.update({
      where: { id },
      data: {
        cantidad: dto.cantidad,
        frecuencia: dto.frecuencia,
        diasPersonalizado: dto.diasPersonalizado,
        diaSemana: dto.diaSemana,
        diaMes: dto.diaMes,
        proximaFecha,
      },
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
      },
    })

    // Registrar log
    await this.prisma.suscripcionLog.create({
      data: {
        suscripcionId: id,
        accion: 'UPDATED',
        resultado: 'SUCCESS',
        mensaje: 'Suscripción actualizada',
      },
    })

    this.logger.log(`Suscripción ${id} actualizada`)

    return updated
  }

  /**
   * Cambia el estado de una suscripción
   */
  async updateEstado(userId: number, id: number, estado: EstadoSuscripcion) {
    const suscripcion = await this.findOne(userId, id)

    if (suscripcion.estado === EstadoSuscripcion.CANCELADA) {
      throw new BadRequestException('No se puede modificar una suscripción cancelada')
    }

    const updated = await this.prisma.suscripcion.update({
      where: { id },
      data: { estado },
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
      },
    })

    // Registrar log
    const accionMap: Record<EstadoSuscripcion, string> = {
      ACTIVA: 'RESUMED',
      PAUSADA: 'PAUSED',
      SUSPENDIDA: 'SUSPENDED',
      CANCELADA: 'CANCELLED',
    }

    await this.prisma.suscripcionLog.create({
      data: {
        suscripcionId: id,
        accion: accionMap[estado],
        resultado: 'SUCCESS',
        mensaje: `Suscripción ${estado.toLowerCase()}`,
      },
    })

    this.logger.log(`Suscripción ${id} cambiada a estado ${estado}`)

    return updated
  }

  /**
   * Pausa una suscripción
   */
  async pause(userId: number, id: number) {
    return this.updateEstado(userId, id, EstadoSuscripcion.PAUSADA)
  }

  /**
   * Reanuda una suscripción pausada
   */
  async resume(userId: number, id: number) {
    const suscripcion = await this.findOne(userId, id)

    if (suscripcion.estado !== EstadoSuscripcion.PAUSADA) {
      throw new BadRequestException('Solo se pueden reanudar suscripciones pausadas')
    }

    // Recalcular próxima fecha
    const proximaFecha = this.calculateNextDate(
      suscripcion.frecuencia,
      suscripcion.diasPersonalizado ?? undefined,
      suscripcion.diaSemana ?? undefined,
      suscripcion.diaMes ?? undefined,
    )

    const updated = await this.prisma.suscripcion.update({
      where: { id },
      data: {
        estado: EstadoSuscripcion.ACTIVA,
        proximaFecha,
      },
      include: {
        producto: {
          include: {
            marca: true,
            unidad: true,
          },
        },
      },
    })

    await this.prisma.suscripcionLog.create({
      data: {
        suscripcionId: id,
        accion: 'RESUMED',
        resultado: 'SUCCESS',
        mensaje: `Suscripción reanudada. Próxima entrega: ${proximaFecha.toLocaleDateString()}`,
      },
    })

    return updated
  }

  /**
   * Cancela una suscripción definitivamente
   */
  async cancel(userId: number, id: number) {
    return this.updateEstado(userId, id, EstadoSuscripcion.CANCELADA)
  }

  /**
   * Procesa suscripciones que están listas para ejecutarse
   * Este método es llamado por el scheduler
   */
  async processDueSubscriptions() {
    const now = new Date()

    const due = await this.prisma.suscripcion.findMany({
      where: {
        estado: EstadoSuscripcion.ACTIVA,
        proximaFecha: { lte: now },
      },
      include: {
        producto: true,
        user: true,
      },
    })

    this.logger.log(`Procesando ${due.length} suscripciones pendientes`)

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    }

    for (const suscripcion of due) {
      try {
        await this.executeSuscripcion(suscripcion)
        results.success++
      } catch (error) {
        this.logger.error(
          `Error procesando suscripción ${suscripcion.id}: ${error.message}`,
        )
        results.failed++
      }
    }

    this.logger.log(
      `Procesamiento completado: ${results.success} exitosas, ${results.failed} fallidas, ${results.skipped} omitidas`,
    )

    return results
  }

  /**
   * Ejecuta una suscripción: agrega el producto al carrito
   */
  private async executeSuscripcion(suscripcion: Suscripcion & { producto: any }) {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar stock
      if (suscripcion.producto.stockActual < suscripcion.cantidad) {
        // Suspender suscripción por falta de stock
        await tx.suscripcion.update({
          where: { id: suscripcion.id },
          data: { estado: EstadoSuscripcion.SUSPENDIDA },
        })

        await tx.suscripcionLog.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'FAILED',
            resultado: 'SUSPENDED',
            mensaje: `Stock insuficiente. Disponible: ${suscripcion.producto.stockActual}, requerido: ${suscripcion.cantidad}`,
          },
        })

        this.logger.warn(
          `Suscripción ${suscripcion.id} suspendida por falta de stock`,
        )
        return
      }

      // Buscar o crear item en carrito
      const existingItem = await tx.carritoItem.findUnique({
        where: {
          userId_productoId: {
            userId: suscripcion.userId,
            productoId: suscripcion.productoId,
          },
        },
      })

      if (existingItem) {
        // Actualizar cantidad
        await tx.carritoItem.update({
          where: { id: existingItem.id },
          data: {
            cantidad: existingItem.cantidad + suscripcion.cantidad,
          },
        })
      } else {
        // Crear nuevo item
        await tx.carritoItem.create({
          data: {
            userId: suscripcion.userId,
            productoId: suscripcion.productoId,
            cantidad: suscripcion.cantidad,
          },
        })
      }

      // Calcular próxima fecha
      const proximaFecha = this.calculateNextDate(
        suscripcion.frecuencia,
        suscripcion.diasPersonalizado ?? undefined,
        suscripcion.diaSemana ?? undefined,
        suscripcion.diaMes ?? undefined,
        suscripcion.proximaFecha,
      )

      // Actualizar suscripción
      await tx.suscripcion.update({
        where: { id: suscripcion.id },
        data: { proximaFecha },
      })

      // Registrar log
      await tx.suscripcionLog.create({
        data: {
          suscripcionId: suscripcion.id,
          accion: 'EXECUTED',
          resultado: 'SUCCESS',
          mensaje: `${suscripcion.cantidad}x ${suscripcion.producto.nombre} agregado al carrito. Próxima entrega: ${proximaFecha.toLocaleDateString()}`,
        },
      })

      this.logger.log(
        `Suscripción ${suscripcion.id} ejecutada exitosamente. Próxima: ${proximaFecha}`,
      )
    })
  }

  /**
   * Obtiene estadísticas de suscripciones (para admin)
   */
  async getStats() {
    const [total, activas, pausadas, suspendidas, canceladas] = await Promise.all([
      this.prisma.suscripcion.count(),
      this.prisma.suscripcion.count({ where: { estado: EstadoSuscripcion.ACTIVA } }),
      this.prisma.suscripcion.count({ where: { estado: EstadoSuscripcion.PAUSADA } }),
      this.prisma.suscripcion.count({ where: { estado: EstadoSuscripcion.SUSPENDIDA } }),
      this.prisma.suscripcion.count({ where: { estado: EstadoSuscripcion.CANCELADA } }),
    ])

    return {
      total,
      activas,
      pausadas,
      suspendidas,
      canceladas,
    }
  }

  /**
   * Obtiene todas las suscripciones (para admin)
   */
  async findAll(page: number = 1, limit: number = 20, estado?: EstadoSuscripcion) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (estado) {
      where.estado = estado
    }

    const [suscripciones, total] = await Promise.all([
      this.prisma.suscripcion.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          producto: {
            include: {
              marca: true,
              unidad: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.suscripcion.count({ where }),
    ])

    return {
      suscripciones,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
}
