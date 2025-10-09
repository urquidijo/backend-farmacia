import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AddToCarritoDto } from './dto/add-to-carrito.dto'
import { UpdateCarritoItemDto } from './dto/update-carrito-item.dto'

@Injectable()
export class CarritoService {
  constructor(private prisma: PrismaService) {}

  async getCarrito(userId: number) {
    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: {
        producto: {
          include: {
            marca: true,
            categoria: true,
            unidad: true,
          },
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
      // Actualizar cantidad
      const updated = await this.prisma.carritoItem.update({
        where: { id: existingItem.id },
        data: { cantidad: existingItem.cantidad + dto.cantidad },
        include: {
          producto: {
            include: {
              marca: true,
              categoria: true,
              unidad: true,
            },
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
          include: {
            marca: true,
            categoria: true,
            unidad: true,
          },
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

    const updated = await this.prisma.carritoItem.update({
      where: { id: itemId },
      data: { cantidad: dto.cantidad },
      include: {
        producto: {
          include: {
            marca: true,
            categoria: true,
            unidad: true,
          },
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
    // Obtener items del carrito
    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: {
        producto: true,
      },
    })

    if (items.length === 0) {
      throw new BadRequestException('El carrito está vacío')
    }

    // Calcular total
    let total = 0
    for (const item of items) {
      total += item.producto.precio.toNumber() * item.cantidad
    }

    // Crear orden con sus items
    const orden = await this.prisma.orden.create({
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

    // Vaciar carrito
    await this.prisma.carritoItem.deleteMany({
      where: { userId },
    })

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
}
