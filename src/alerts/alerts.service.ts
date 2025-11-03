import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  Alert,
  AlertSeverity,
  AlertType,
  Lote,
  Prisma,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AlertsEvents } from './alerts.events'
import { AlertListItem, AlertsQueryParams } from './alerts.types'

type AlertWithRelations = Prisma.AlertGetPayload<{
  include: {
    producto: {
      select: {
        id: true
        nombre: true
        stockActual: true
        stockMinimo: true
        marca: { select: { nombre: true } }
        categoria: { select: { nombre: true } }
        proveedor: {
          select: {
            id: true
            nombre: true
            contacto: true
            telefono: true
            email: true
          }
        }
      }
    }
    lote: {
      select: {
        id: true
        codigo: true
        fechaVenc: true
        cantidad: true
      }
    }
  }
}>

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  INFO: 1,
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly events: AlertsEvents,
  ) {}

  private getDefaultWindowDays(): number {
    const fromConfig = this.configService.get<number>('ALERT_WINDOW_DAYS')
    if (fromConfig && Number.isFinite(fromConfig) && fromConfig > 0) {
      return Math.floor(fromConfig)
    }
    const fromEnv = parseInt(process.env.ALERT_WINDOW_DAYS ?? '', 10)
    if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
    return 30
  }

  async syncAllAlerts(options: {
    source?: 'manual' | 'cron' | 'inventory'
    windowDays?: number
    emit?: boolean
  } = {}) {
    const windowDays = options.windowDays ?? this.getDefaultWindowDays()
    const shouldEmit = options.emit ?? true
    const stockChanges = await this.refreshStockAlerts()
    const expiryChanges = await this.refreshExpiryAlerts(windowDays)

    if (shouldEmit) {
      this.emitChanges(stockChanges)
      this.emitChanges(expiryChanges)
    }

    if (options.source === 'cron') {
      this.logger.log(
        `Sincronizadas alertas (stock: ${stockChanges.created.length} nuevas, ${stockChanges.updated.length} actualizadas, ${stockChanges.resolved.length} resueltas; vencimiento: ${expiryChanges.created.length} nuevas, ${expiryChanges.updated.length} actualizadas, ${expiryChanges.resolved.length} resueltas)`,
      )
    }
  }

  private emitChanges(changes: SyncResult) {
    for (const alert of changes.created) {
      this.events.emit({
        type: 'alert.created',
        payload: this.mapAlert(alert),
      })
    }
    for (const alert of changes.updated) {
      this.events.emit({
        type: 'alert.updated',
        payload: this.mapAlert(alert),
      })
    }
    for (const id of changes.resolved) {
      this.events.emit({ type: 'alert.resolved', payload: { id } })
    }
  }

  async getAlerts(params: AlertsQueryParams = {}) {
    await this.syncAllAlerts({ source: 'manual', emit: false })

    const page = params.page && params.page > 0 ? params.page : 1
    const pageSize =
      params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20
    const skip = (page - 1) * pageSize
    const typeFilter =
      params.type === 'stock'
        ? AlertType.STOCK_BAJO
        : params.type === 'expiry'
        ? AlertType.VENCIMIENTO
        : undefined
    const severityFilter = params.severity
    const effectiveWindow = params.windowDays ?? this.getDefaultWindowDays()

    const where: Prisma.AlertWhereInput = {
      resolvedAt: null,
    }

    if (typeFilter) {
      where.type = typeFilter
    }

    if (severityFilter) {
      where.severity = severityFilter
    }

    if (params.unreadOnly) {
      where.leida = false
    }

    const andConditions: Prisma.AlertWhereInput[] = []

    if (params.search) {
      const search = params.search.trim()
      andConditions.push({
        OR: [
          {
            producto: {
              nombre: { contains: search, mode: Prisma.QueryMode.insensitive },
            },
          },
          {
            producto: {
              categoria: {
                nombre: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
          {
            producto: {
              marca: {
                nombre: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        ],
      })
    }

    if (params.type !== 'stock') {
      andConditions.push({
        OR: [
          { type: AlertType.STOCK_BAJO },
          {
            type: AlertType.VENCIMIENTO,
            venceEnDias: { lte: effectiveWindow * 2 },
          },
        ],
      })
    }

    if (andConditions.length) {
      where.AND = andConditions
    }

    const include = this.alertInclude()

    const [alerts, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        where,
        include,
        orderBy: [
          { severity: 'desc' },
          { venceEnDias: 'asc' },
          { stockActual: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({
        where: { ...where, leida: false },
      }),
    ])

    return {
      data: alerts.map(alert => this.mapAlert(alert)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        unread: unreadCount,
      },
    }
  }

  async getStockAlerts() {
    return this.getAlerts({ type: 'stock' })
  }

  async getExpiryAlerts(windowDays?: number) {
    return this.getAlerts({ type: 'expiry', windowDays })
  }

  async markAsRead(id: number) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: this.alertInclude(),
    })
    if (!alert || alert.resolvedAt) {
      throw new NotFoundException('Alerta no encontrada')
    }
    if (alert.leida) {
      return this.mapAlert(alert)
    }

    const updated = await this.prisma.alert.update({
      where: { id },
      data: { leida: true },
      include: this.alertInclude(),
    })

    this.events.emit({
      type: 'alert.updated',
      payload: this.mapAlert(updated),
    })

    return this.mapAlert(updated)
  }

  async markAllAsRead(type?: 'stock' | 'expiry') {
    const where: Prisma.AlertWhereInput = { leida: false, resolvedAt: null }
    if (type === 'stock') {
      where.type = AlertType.STOCK_BAJO
    }
    if (type === 'expiry') {
      where.type = AlertType.VENCIMIENTO
    }
    const result = await this.prisma.alert.updateMany({
      where,
      data: { leida: true },
    })
    return { updated: result.count }
  }

  private async refreshStockAlerts(): Promise<SyncResult> {
    const products = await this.prisma.producto.findMany({
      select: {
        id: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
      },
    })

    const activeAlerts = await this.prisma.alert.findMany({
      where: { type: AlertType.STOCK_BAJO, resolvedAt: null },
      include: this.alertInclude(),
    })

    const activeMap = new Map<number, AlertWithRelations>()
    for (const alert of activeAlerts) {
      activeMap.set(alert.productoId, alert)
    }

    const toCreate: Prisma.AlertCreateInput[] = []
    const toUpdate: { id: number; data: Prisma.AlertUpdateInput }[] = []
    const toResolve: number[] = []
    const seenProducts = new Set<number>()

    for (const product of products) {
      seenProducts.add(product.id)
      const evaluation = this.evaluateStockAlert(product)
      const existing = activeMap.get(product.id)

      if (!evaluation) {
        if (existing) toResolve.push(existing.id)
        continue
      }

      if (!existing) {
        toCreate.push({
          type: AlertType.STOCK_BAJO,
          producto: { connect: { id: product.id } },
          mensaje: evaluation.message,
          severity: evaluation.severity,
          stockActual: evaluation.stockActual,
          stockMinimo: evaluation.stockMinimo,
          windowDias: this.getDefaultWindowDays(),
        })
        continue
      }

      const severityChanged = existing.severity !== evaluation.severity
      const messageChanged = existing.mensaje !== evaluation.message
      const stockChanged =
        existing.stockActual !== evaluation.stockActual ||
        existing.stockMinimo !== evaluation.stockMinimo

      if (severityChanged || messageChanged || stockChanged) {
        toUpdate.push({
          id: existing.id,
          data: {
            severity: evaluation.severity,
            mensaje: evaluation.message,
            stockActual: evaluation.stockActual,
            stockMinimo: evaluation.stockMinimo,
            leida:
              severityChanged &&
              SEVERITY_WEIGHT[evaluation.severity] >
                SEVERITY_WEIGHT[existing.severity]
                ? false
                : existing.leida,
          },
        })
      }
    }

    for (const alert of activeAlerts) {
      if (!seenProducts.has(alert.productoId)) {
        toResolve.push(alert.id)
      }
    }

    return this.persistChanges({ toCreate, toUpdate, toResolve })
  }

  private async refreshExpiryAlerts(
    windowDays: number,
  ): Promise<SyncResult> {
    const now = new Date()
    const maxDate = new Date(now.getTime())
    maxDate.setDate(now.getDate() + windowDays * 2)

    const lotes = await this.prisma.lote.findMany({
      where: {
        fechaVenc: { lte: maxDate },
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            stockActual: true,
            stockMinimo: true,
          },
        },
      },
    })

    const activeAlerts = await this.prisma.alert.findMany({
      where: { type: AlertType.VENCIMIENTO, resolvedAt: null },
      include: this.alertInclude(),
    })

    const activeMap = new Map<number, AlertWithRelations>()
    for (const alert of activeAlerts) {
      if (alert.loteId) activeMap.set(alert.loteId, alert)
    }

    const toCreate: Prisma.AlertCreateInput[] = []
    const toUpdate: { id: number; data: Prisma.AlertUpdateInput }[] = []
    const toResolve: number[] = []
    const seenLotes = new Set<number>()

    for (const lote of lotes) {
      seenLotes.add(lote.id)
      const evaluation = this.evaluateExpiryAlert(lote, windowDays)
      const existing = activeMap.get(lote.id)

      if (!evaluation) {
        if (existing) toResolve.push(existing.id)
        continue
      }

      if (!existing) {
        toCreate.push({
          type: AlertType.VENCIMIENTO,
          producto: { connect: { id: lote.productoId } },
          lote: { connect: { id: lote.id } },
          mensaje: evaluation.message,
          severity: evaluation.severity,
          venceEnDias: evaluation.daysUntil,
          stockActual: lote.producto.stockActual,
          stockMinimo: lote.producto.stockMinimo,
          windowDias: this.getDefaultWindowDays(),
        })
        continue
      }

      const severityChanged = existing.severity !== evaluation.severity
      const messageChanged = existing.mensaje !== evaluation.message
      const daysChanged = existing.venceEnDias !== evaluation.daysUntil

      if (severityChanged || messageChanged || daysChanged) {
        toUpdate.push({
          id: existing.id,
          data: {
            severity: evaluation.severity,
            mensaje: evaluation.message,
            venceEnDias: evaluation.daysUntil,
            leida:
              severityChanged &&
              SEVERITY_WEIGHT[evaluation.severity] >
                SEVERITY_WEIGHT[existing.severity]
                ? false
                : existing.leida,
          },
        })
      }
    }

    for (const alert of activeAlerts) {
      if (alert.loteId && !seenLotes.has(alert.loteId)) {
        toResolve.push(alert.id)
      }
    }

    return this.persistChanges({ toCreate, toUpdate, toResolve })
  }

  private evaluateStockAlert(product: {
    stockActual: number
    stockMinimo: number
    nombre: string
  }):
    | {
        severity: AlertSeverity
        message: string
        stockActual: number
        stockMinimo: number
      }
    | null {
    const actual = product.stockActual ?? 0
    const minimo = product.stockMinimo ?? 0

    if (actual <= 0) {
      return {
        severity: AlertSeverity.CRITICAL,
        message: `Sin stock disponible`,
        stockActual: actual,
        stockMinimo: minimo,
      }
    }

    if (actual <= minimo) {
      return {
        severity: AlertSeverity.WARNING,
        message: `Stock bajo (${actual}/${minimo})`,
        stockActual: actual,
        stockMinimo: minimo,
      }
    }

    return null
  }

  private evaluateExpiryAlert(
    lote: Lote & {
      producto: { nombre: string; stockActual: number; stockMinimo: number }
    },
    windowDays: number,
  ):
    | {
        severity: AlertSeverity
        message: string
        daysUntil: number
      }
    | null {
    const now = new Date()
    const diffMs = lote.fechaVenc.getTime() - now.getTime()
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (days > windowDays * 2) {
      return null
    }

    if (lote.cantidad <= 0) {
      return null
    }

    if (days <= 3) {
      const message =
        days < 0
          ? `Lote vencido hace ${Math.abs(days)} día(s)`
          : `Lote vence en ${days} día(s)`
      return { severity: AlertSeverity.CRITICAL, message, daysUntil: days }
    }

    if (days <= windowDays) {
      return {
        severity: AlertSeverity.WARNING,
        message: `Lote vence en ${days} día(s)`,
        daysUntil: days,
      }
    }

    if (days <= windowDays * 2) {
      return {
        severity: AlertSeverity.INFO,
        message: `Lote vence en ${days} día(s)`,
        daysUntil: days,
      }
    }

    return null
  }

  private alertInclude() {
    return {
      producto: {
        select: {
          id: true,
          nombre: true,
          stockActual: true,
          stockMinimo: true,
          marca: { select: { nombre: true } },
          categoria: { select: { nombre: true } },
          proveedor: {
            select: {
              id: true,
              nombre: true,
              contacto: true,
              telefono: true,
              email: true,
            },
          },
        },
      },
      lote: {
        select: {
          id: true,
          codigo: true,
          fechaVenc: true,
          cantidad: true,
        },
      },
    } satisfies Prisma.AlertInclude
  }

  private async persistChanges({
    toCreate,
    toUpdate,
    toResolve,
  }: {
    toCreate: Prisma.AlertCreateInput[]
    toUpdate: { id: number; data: Prisma.AlertUpdateInput }[]
    toResolve: number[]
  }): Promise<SyncResult> {
    const created: AlertWithRelations[] = []
    const updated: AlertWithRelations[] = []
    const resolved: number[] = []

    if (!toCreate.length && !toUpdate.length && !toResolve.length) {
      return { created, updated, resolved }
    }

    await this.prisma.$transaction(async tx => {
      for (const data of toCreate) {
        const alert = await tx.alert.create({
          data,
          include: this.alertInclude(),
        })
        created.push(alert)
      }
      for (const item of toUpdate) {
        const alert = await tx.alert.update({
          where: { id: item.id },
          data: item.data,
          include: this.alertInclude(),
        })
        updated.push(alert)
      }
      for (const id of toResolve) {
        await tx.alert.update({
          where: { id },
          data: { resolvedAt: new Date(), updatedAt: new Date() },
        })
        resolved.push(id)
      }
    })

    return { created, updated, resolved }
  }

  private mapAlert(alert: AlertWithRelations): AlertListItem {
    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      mensaje: alert.mensaje,
      venceEnDias: alert.venceEnDias,
      stockActual: alert.stockActual,
      stockMinimo: alert.stockMinimo,
      windowDias: alert.windowDias,
      leida: alert.leida,
      createdAt: alert.createdAt.toISOString(),
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
      producto: {
        id: alert.producto.id,
        nombre: alert.producto.nombre,
        marca: alert.producto.marca?.nombre ?? null,
        categoria: alert.producto.categoria?.nombre ?? null,
        stockActual: alert.producto.stockActual,
        stockMinimo: alert.producto.stockMinimo,
        proveedor: alert.producto.proveedor
          ? {
              id: alert.producto.proveedor.id,
              nombre: alert.producto.proveedor.nombre,
              contacto: alert.producto.proveedor.contacto,
              telefono: alert.producto.proveedor.telefono,
              email: alert.producto.proveedor.email,
            }
          : null,
      },
      lote: alert.lote
        ? {
            id: alert.lote.id,
            codigo: alert.lote.codigo,
            cantidad: alert.lote.cantidad,
            fechaVenc: alert.lote.fechaVenc.toISOString(),
          }
        : undefined,
    }
  }
}

type SyncResult = {
  created: AlertWithRelations[]
  updated: AlertWithRelations[]
  resolved: number[]
}
