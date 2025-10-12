import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AddToCarritoDto } from './dto/add-to-carrito.dto'
import { UpdateCarritoItemDto } from './dto/update-carrito-item.dto'
import { AlertsService } from '../alerts/alerts.service'

@Injectable()
export class CarritoService {
  constructor(
    private prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async getCarrito(userId: number) {
    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            imageUrl: true,
            marca: {
              select: { nombre: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Convertir precios a número
    return items.map(item => ({
      ...item,
      producto: {
        ...item.producto,
        precio: item.producto.precio.toNumber(),
      },
    }))
  }

  async addToCarrito(userId: number, dto: AddToCarritoDto) {
    // Verificar que el producto existe y está activo
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    })

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${dto.productoId} no encontrado`)
    }

    if (!producto.activo) {
      throw new BadRequestException('El producto no está disponible')
    }

    const disponible = await this.getProductoStock(producto.id)
    if (disponible <= 0) {
      throw new BadRequestException('Sin stock disponible para este producto')
    }

    if (dto.cantidad > disponible) {
      throw new BadRequestException(
        `Solo hay ${disponible} unidades disponibles`,
      )
    }

    // Verificar si ya existe en el carrito
    const existingItem = await this.prisma.carritoItem.findUnique({
      where: {
        userId_productoId: {
          userId: userId,
          productoId: dto.productoId,
        },
      },
    })

    if (existingItem) {
      const nuevaCantidad = existingItem.cantidad + dto.cantidad
      if (nuevaCantidad > disponible) {
        throw new BadRequestException(
          `Solo hay ${disponible} unidades disponibles`,
        )
      }

      // Actualizar cantidad
      const updated = await this.prisma.carritoItem.update({
        where: { id: existingItem.id },
        data: { cantidad: nuevaCantidad },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              precio: true,
              imageUrl: true,
              marca: { select: { nombre: true } }
            }
          },
        },
      })

      return {
        ...updated,
        producto: {
          ...updated.producto,
          precio: updated.producto.precio.toNumber(),
        },
      }
    }

    // Crear nuevo item
    const newItem = await this.prisma.carritoItem.create({
      data: {
        userId,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            imageUrl: true,
            marca: { select: { nombre: true } }
          }
        },
      },
    })

    return {
      ...newItem,
      producto: {
        ...newItem.producto,
        precio: newItem.producto.precio.toNumber(),
      },
    }
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCarritoItemDto) {
    const item = await this.prisma.carritoItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    })

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito')
    }

    const disponible = await this.getProductoStock(item.productoId)
    if (dto.cantidad > disponible) {
      throw new BadRequestException(
        `Solo hay ${disponible} unidades disponibles`,
      )
    }

    const updated = await this.prisma.carritoItem.update({
      where: { id: itemId },
      data: { cantidad: dto.cantidad },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            imageUrl: true,
            marca: { select: { nombre: true } }
          }
        },
      },
    })

    return {
      ...updated,
      producto: {
        ...updated.producto,
        precio: updated.producto.precio.toNumber(),
      },
    }
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.prisma.carritoItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    })

    if (!item) {
      throw new NotFoundException('Item no encontrado en el carrito')
    }

    await this.prisma.carritoItem.delete({
      where: { id: itemId },
    })

    return { message: 'Item eliminado del carrito' }
  }

  async clearCarrito(userId: number) {
    await this.prisma.carritoItem.deleteMany({
      where: { userId },
    })

    return { message: 'Carrito vaciado' }
  }

  async createOrden(userId: number) {
    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: {
        producto: true,
      },
    })

    if (items.length === 0) {
      throw new BadRequestException('El carrito está vacío')
    }

    let total = 0
    for (const item of items) {
      total += item.producto.precio.toNumber() * item.cantidad
    }

    const orden = await this.prisma.$transaction(async tx => {
      const productos = await tx.producto.findMany({
        where: { id: { in: items.map(item => item.productoId) } },
        select: { id: true, nombre: true, stockActual: true },
      })
      const productoMap = new Map(productos.map(p => [p.id, p]))

      for (const item of items) {
        const producto = productoMap.get(item.productoId)
        if (!producto) {
          throw new NotFoundException(
            `Producto ${item.productoId} no encontrado`,
          )
        }
        if (producto.stockActual < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${producto.nombre}: disponible ${producto.stockActual}`,
          )
        }
      }

      const created = await tx.orden.create({
        data: {
          userId,
          total,
          items: {
            create: items.map(item => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.producto.precio,
              subtotal: item.producto.precio.toNumber() * item.cantidad,
            })),
          },
        },
        include: {
          items: {
            include: {
              producto: true,
            },
          },
        },
      })

      for (const item of items) {
        const producto = productoMap.get(item.productoId)!
        await this.consumeFromLots(
          tx,
          producto.id,
          item.cantidad,
          producto.nombre,
        )
      }

      await tx.carritoItem.deleteMany({ where: { userId } })

      return created
    })

    this.alertsService
      .syncAllAlerts({ source: 'inventory' })
      .catch(err => console.error('No se pudieron recalcular alertas', err))

    return {
      ...orden,
      total: orden.total.toNumber(),
      items: orden.items.map(item => ({
        ...item,
        precioUnitario: item.precioUnitario.toNumber(),
        subtotal: item.subtotal.toNumber(),
        producto: {
          ...item.producto,
          precio: item.producto.precio.toNumber(),
        },
      })),
    }
  }

  private async getProductoStock(productoId: number) {
    const result = await this.prisma.lote.aggregate({
      where: { productoId },
      _sum: { cantidad: true },
    })
    return result._sum.cantidad ?? 0
  }

  private async consumeFromLots(
    tx: Prisma.TransactionClient,
    productoId: number,
    cantidad: number,
    nombreProducto: string,
  ) {
    let restante = cantidad
    const lotes = await tx.lote.findMany({
      where: { productoId },
      orderBy: { fechaVenc: 'asc' },
    })

    for (const lote of lotes) {
      if (restante <= 0) break
      if (lote.cantidad <= 0) continue

      const descontar = Math.min(lote.cantidad, restante)
      await tx.lote.update({
        where: { id: lote.id },
        data: { cantidad: lote.cantidad - descontar },
      })
      restante -= descontar
    }

    if (restante > 0) {
      throw new BadRequestException(
        `Stock insuficiente para ${nombreProducto}: faltan ${restante} unidades`,
      )
    }

    await this.recalculateProductoStock(tx, productoId)
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
  }
}

