import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, SegmentoRFM, PrioridadReposicion, EstadoReposicion } from '@prisma/client'

export interface VentaDiaria {
  fecha: Date
  cantidad: number
  productoId: number
}

export interface TendenciaProducto {
  productoId: number
  productoNombre: string
  tendencia: 'alza' | 'baja' | 'estable'
  cambioPromedio: number
  ventasUltimos30: number
  ventasAnteriores30: number
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extrae datos históricos de ventas para análisis
   */
  async extraerDatosHistoricos(diasAtras: number = 180): Promise<VentaDiaria[]> {
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras)

    const ordenes = await this.prisma.orden.findMany({
      where: {
        createdAt: { gte: fechaInicio },
        estado: { not: 'CANCELADA' }, // Incluir todas excepto canceladas
      },
      include: {
        items: {
          select: {
            productoId: true,
            cantidad: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    this.logger.log(
      `Extrayendo datos históricos: ${ordenes.length} órdenes encontradas desde ${fechaInicio.toISOString().split('T')[0]}`,
    )

    const ventasPorDia: VentaDiaria[] = []

    for (const orden of ordenes) {
      const fecha = new Date(orden.createdAt)
      fecha.setHours(0, 0, 0, 0)

      for (const item of orden.items) {
        ventasPorDia.push({
          fecha,
          cantidad: item.cantidad,
          productoId: item.productoId,
        })
      }
    }

    this.logger.log(`Total de registros de ventas: ${ventasPorDia.length}`)

    return ventasPorDia
  }

  /**
   * Implementa regresión lineal simple para pronóstico
   */
  private regresionLineal(datos: number[]): { a: number; b: number } {
    const n = datos.length
    if (n < 2) return { a: 0, b: datos[0] || 0 }

    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += datos[i]
      sumXY += i * datos[i]
      sumX2 += i * i
    }

    const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const a = (sumY - b * sumX) / n

    return { a, b }
  }

  /**
   * Calcula promedio móvil ponderado
   */
  private promedioMovil(datos: number[], ventana: number = 7): number {
    if (datos.length === 0) return 0
    const ultimos = datos.slice(-ventana)
    const suma = ultimos.reduce((acc, val) => acc + val, 0)
    return suma / ultimos.length
  }

  /**
   * Genera pronósticos para un producto específico usando datos históricos ya cargados
   */
  private generarPronosticoProductoConDatos(
    productoId: number,
    ventasHistoricas: VentaDiaria[],
    diasProyeccion: number = 30,
    modelo: string = 'promedio_movil',
  ) {
    // Filtrar ventas del producto específico
    const ventasProducto = ventasHistoricas.filter((v) => v.productoId === productoId)

    // Agrupar por día
    const ventasPorDia = new Map<string, number>()
    for (const venta of ventasProducto) {
      const key = venta.fecha.toISOString().split('T')[0]
      ventasPorDia.set(key, (ventasPorDia.get(key) || 0) + venta.cantidad)
    }

    // Convertir a array ordenado
    const fechas = Array.from(ventasPorDia.keys()).sort()
    const cantidades = fechas.map((f) => ventasPorDia.get(f) || 0)

    if (cantidades.length < 2) {
      // No hay suficientes datos - usar promedio del stock actual o cero
      this.logger.warn(
        `Producto ${productoId}: Insuficientes datos históricos (${cantidades.length} días)`,
      )

      // Intentar obtener un pronóstico base del promedio de ventas si hay al menos 1 dato
      const promedioVentas = cantidades.length > 0
        ? cantidades.reduce((a, b) => a + b, 0) / cantidades.length
        : 0

      return {
        cantidadProyectada: Math.round(promedioVentas),
        nivelConfianza: 0.3,
        tendencia: 'estable',
      }
    }

    let proyeccion = 0
    let confianza = 0.7

    if (modelo === 'regresion_lineal') {
      const { a, b } = this.regresionLineal(cantidades)
      proyeccion = a + b * cantidades.length
      confianza = 0.75
    } else if (modelo === 'promedio_movil') {
      proyeccion = this.promedioMovil(cantidades, 14)
      confianza = 0.8
    } else {
      // ARIMA simplificado (usamos promedio móvil con ajuste de tendencia)
      const pm = this.promedioMovil(cantidades, 14)
      const { b } = this.regresionLineal(cantidades.slice(-30))
      proyeccion = pm + b * 7
      confianza = 0.85
    }

    // Determinar tendencia
    const ultimos15 = cantidades.slice(-15)
    const anteriores15 = cantidades.slice(-30, -15)
    const promedioUltimos = ultimos15.reduce((a, b) => a + b, 0) / ultimos15.length
    const promedioAnteriores = anteriores15.reduce((a, b) => a + b, 0) / anteriores15.length

    let tendencia: 'alza' | 'baja' | 'estable' = 'estable'
    if (promedioUltimos > promedioAnteriores * 1.15) tendencia = 'alza'
    else if (promedioUltimos < promedioAnteriores * 0.85) tendencia = 'baja'

    return {
      cantidadProyectada: Math.max(0, Math.round(proyeccion)),
      nivelConfianza: confianza,
      tendencia,
    }
  }

  /**
   * Genera pronósticos para todos los productos activos
   */
  async generarTodosLosPronosticos(
    diasProyeccion: number = 30,
    modelo: string = 'promedio_movil',
  ) {
    const productos = await this.prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
    })

    // ✅ OPTIMIZACIÓN: Extraer datos históricos UNA SOLA VEZ para todos los productos
    this.logger.log('Extrayendo datos históricos (una sola vez para todos los productos)...')
    const ventasHistoricas = await this.extraerDatosHistoricos(180)
    this.logger.log(
      `Datos históricos cargados. Generando pronósticos para ${productos.length} productos...`,
    )

    const forecasts: any[] = []

    for (const producto of productos) {
      try {
        // Pasar los datos históricos ya cargados en lugar de consultarlos de nuevo
        const pronostico = this.generarPronosticoProductoConDatos(
          producto.id,
          ventasHistoricas,
          diasProyeccion,
          modelo,
        )

        const periodo = new Date()
        periodo.setDate(periodo.getDate() + diasProyeccion)
        periodo.setHours(0, 0, 0, 0)

        // Guardar o actualizar en BD
        await this.prisma.forecast.upsert({
          where: {
            productoId_periodo: {
              productoId: producto.id,
              periodo,
            },
          },
          update: {
            cantidadProyectada: pronostico.cantidadProyectada,
            nivelConfianza: pronostico.nivelConfianza,
            tendencia: pronostico.tendencia,
            modelo,
          },
          create: {
            productoId: producto.id,
            periodo,
            cantidadProyectada: pronostico.cantidadProyectada,
            nivelConfianza: pronostico.nivelConfianza,
            tendencia: pronostico.tendencia,
            modelo,
          },
        })

        forecasts.push({
          productoId: producto.id,
          productoNombre: producto.nombre,
          ...pronostico,
        })
      } catch (error) {
        this.logger.error(`Error generando pronóstico para ${producto.nombre}`, error)
      }
    }

    this.logger.log(`✅ Generados ${forecasts.length} pronósticos exitosamente`)
    return forecasts
  }

  /**
   * Análisis RFM (Recency, Frequency, Monetary) para segmentación de clientes
   */
  async analizarRFM() {
    const usuarios = await this.prisma.user.findMany({
      include: {
        ordenes: {
          where: { estado: { not: 'CANCELADA' } }, // Incluir todas excepto canceladas
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    const segmentos: any[] = []

    for (const user of usuarios) {
      if (user.ordenes.length === 0) continue

      const ahora = new Date()
      const ultimaOrden = user.ordenes[0]
      const recency = Math.floor(
        (ahora.getTime() - ultimaOrden.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      const frequency = user.ordenes.length
      const monetary = user.ordenes.reduce(
        (sum, orden) => sum + Number(orden.total),
        0,
      )

      // Lógica de segmentación
      let segmento: SegmentoRFM = SegmentoRFM.NUEVO

      if (recency > 90) {
        segmento = SegmentoRFM.INACTIVO
      } else if (frequency >= 10 && monetary >= 1000 && recency <= 30) {
        segmento = SegmentoRFM.VIP
      } else if (frequency >= 5 && recency <= 45) {
        segmento = SegmentoRFM.FRECUENTE
      } else if (frequency >= 2) {
        segmento = SegmentoRFM.OCASIONAL
      }

      // Guardar o actualizar
      await this.prisma.clienteSegmento.upsert({
        where: { userId: user.id },
        update: {
          segmento,
          recency,
          frequency,
          monetary,
          ultimaCompra: ultimaOrden.createdAt,
        },
        create: {
          userId: user.id,
          segmento,
          recency,
          frequency,
          monetary,
          ultimaCompra: ultimaOrden.createdAt,
        },
      })

      segmentos.push({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        segmento,
        recency,
        frequency,
        monetary,
      })
    }

    this.logger.log(`Segmentados ${segmentos.length} clientes`)
    return segmentos
  }

  /**
   * Genera alertas de reposición basadas en pronósticos y stock actual
   */
  async generarAlertasReposicion() {
    const productos = await this.prisma.producto.findMany({
      where: { activo: true },
      include: {
        forecasts: {
          orderBy: { periodo: 'desc' },
          take: 1,
        },
        proveedor: {
          select: { id: true, nombre: true },
        },
      },
    })

    const alertas: any[] = []

    for (const producto of productos) {
      const forecast = producto.forecasts[0]
      if (!forecast) continue

      const stockActual = producto.stockActual
      const demandaProyectada = Number(forecast.cantidadProyectada)
      const stockMinimo = producto.stockMinimo

      // Días de cobertura = stock actual / (demanda diaria promedio)
      const demandaDiaria = demandaProyectada / 30
      const diasCobertura = demandaDiaria > 0 ? Math.floor(stockActual / demandaDiaria) : 999

      // Stock proyectado al final del periodo
      const stockProyectado = Math.max(0, stockActual - demandaProyectada)

      let prioridad: PrioridadReposicion = PrioridadReposicion.BAJA
      let cantidadSugerida = 0

      if (stockProyectado <= 0 || diasCobertura <= 7) {
        prioridad = PrioridadReposicion.CRITICA
        cantidadSugerida = Math.max(stockMinimo * 2, demandaProyectada * 2)
      } else if (stockProyectado <= stockMinimo || diasCobertura <= 15) {
        prioridad = PrioridadReposicion.ALTA
        cantidadSugerida = Math.max(stockMinimo, demandaProyectada)
      } else if (diasCobertura <= 30) {
        prioridad = PrioridadReposicion.MEDIA
        cantidadSugerida = stockMinimo
      }

      if (cantidadSugerida > 0) {
        const fechaReposicion = new Date()
        fechaReposicion.setDate(fechaReposicion.getDate() + Math.max(0, diasCobertura - 7))

        const notas = `Stock actual: ${stockActual}. Demanda proyectada (30d): ${demandaProyectada}. ${producto.proveedor ? `Proveedor: ${producto.proveedor.nombre}` : 'Sin proveedor asignado'}`

        // Crear alerta si no existe una pendiente
        const alertaExistente = await this.prisma.reposicionAlerta.findFirst({
          where: {
            productoId: producto.id,
            estado: EstadoReposicion.PENDIENTE,
          },
        })

        if (!alertaExistente) {
          await this.prisma.reposicionAlerta.create({
            data: {
              productoId: producto.id,
              cantidadSugerida: Math.round(cantidadSugerida),
              stockProyectado: Math.round(stockProyectado),
              diasCobertura,
              prioridad,
              estado: EstadoReposicion.PENDIENTE,
              fechaReposicion,
              notas,
            },
          })

          alertas.push({
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidadSugerida: Math.round(cantidadSugerida),
            prioridad,
            diasCobertura,
          })
        }
      }
    }

    this.logger.log(`Generadas ${alertas.length} alertas de reposición`)
    return alertas
  }

  /**
   * Obtiene tendencias de productos (alza, baja, estable)
   */
  async obtenerTendencias(): Promise<TendenciaProducto[]> {
    const productos = await this.prisma.producto.findMany({
      where: { activo: true },
      include: {
        forecasts: {
          orderBy: { periodo: 'desc' },
          take: 1,
        },
      },
    })

    const ventasHistoricas = await this.extraerDatosHistoricos(60)

    const tendencias: TendenciaProducto[] = []

    for (const producto of productos) {
      const forecast = producto.forecasts[0]
      const ventasProducto = ventasHistoricas.filter((v) => v.productoId === producto.id)

      const ahora = new Date()
      const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
      const hace60 = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)

      const ventasUltimos30 = ventasProducto
        .filter((v) => v.fecha >= hace30)
        .reduce((sum, v) => sum + v.cantidad, 0)

      const ventasAnteriores30 = ventasProducto
        .filter((v) => v.fecha >= hace60 && v.fecha < hace30)
        .reduce((sum, v) => sum + v.cantidad, 0)

      const cambio = ventasAnteriores30 > 0
        ? ((ventasUltimos30 - ventasAnteriores30) / ventasAnteriores30) * 100
        : 0

      tendencias.push({
        productoId: producto.id,
        productoNombre: producto.nombre,
        tendencia: forecast?.tendencia as any || 'estable',
        cambioPromedio: cambio,
        ventasUltimos30,
        ventasAnteriores30,
      })
    }

    return tendencias.sort((a, b) => Math.abs(b.cambioPromedio) - Math.abs(a.cambioPromedio))
  }

  /**
   * Obtiene KPIs del dashboard
   */
  async obtenerKPIs() {
    const [
      productosTendenciaAlza,
      productosTendenciaBaja,
      clientesVIP,
      clientesFrecuentes,
      alertasReposicion,
      alertasCriticas,
    ] = await Promise.all([
      this.prisma.forecast.count({
        where: { tendencia: 'alza' },
      }),
      this.prisma.forecast.count({
        where: { tendencia: 'baja' },
      }),
      this.prisma.clienteSegmento.count({
        where: { segmento: SegmentoRFM.VIP },
      }),
      this.prisma.clienteSegmento.count({
        where: { segmento: SegmentoRFM.FRECUENTE },
      }),
      this.prisma.reposicionAlerta.count({
        where: { estado: EstadoReposicion.PENDIENTE },
      }),
      this.prisma.reposicionAlerta.count({
        where: {
          estado: EstadoReposicion.PENDIENTE,
          prioridad: PrioridadReposicion.CRITICA,
        },
      }),
    ])

    // Categorías más vendidas (últimos 30 días)
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)

    const categoriasVentas = await this.prisma.ordenItem.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      where: {
        orden: {
          createdAt: { gte: hace30 },
          estado: { in: ['PAGADA', 'ENVIADA', 'ENTREGADA'] },
        },
      },
    })

    const productosIds = categoriasVentas.map((c) => c.productoId)
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: productosIds } },
      include: { categoria: true },
    })

    const ventasPorCategoria = new Map<string, number>()
    for (const item of categoriasVentas) {
      const producto = productos.find((p) => p.id === item.productoId)
      if (producto) {
        const catNombre = producto.categoria.nombre
        ventasPorCategoria.set(
          catNombre,
          (ventasPorCategoria.get(catNombre) || 0) + (item._sum.cantidad || 0),
        )
      }
    }

    const topCategorias = Array.from(ventasPorCategoria.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    return {
      productosTendenciaAlza,
      productosTendenciaBaja,
      clientesVIP,
      clientesFrecuentes,
      alertasReposicion,
      alertasCriticas,
      topCategorias,
    }
  }

  /**
   * Obtiene clientes segmentados
   */
  async obtenerClientesSegmentados(segmento?: SegmentoRFM) {
    const where = segmento ? { segmento } : {}

    return this.prisma.clienteSegmento.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { monetary: 'desc' },
    })
  }

  /**
   * Obtiene alertas de reposición
   */
  async obtenerAlertasReposicion(estado?: EstadoReposicion) {
    const where = estado ? { estado } : { estado: EstadoReposicion.PENDIENTE }

    return this.prisma.reposicionAlerta.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            stockActual: true,
            stockMinimo: true,
            proveedor: {
              select: {
                id: true,
                nombre: true,
                contacto: true,
              },
            },
          },
        },
      },
      orderBy: [{ prioridad: 'desc' }, { diasCobertura: 'asc' }],
    })
  }

  /**
   * Obtiene pronósticos guardados
   */
  async obtenerPronosticos(productoId?: number) {
    const where = productoId ? { productoId } : {}

    return this.prisma.forecast.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            stockActual: true,
            categoria: { select: { nombre: true } },
            marca: { select: { nombre: true } },
          },
        },
      },
      orderBy: { periodo: 'asc' },
    })
  }

  /**
   * Obtiene los productos con mayores pronósticos de ventas
   */
  async obtenerTopPronosticos(categoriaId?: number) {
    // Obtener el pronóstico más reciente por producto
    const forecasts = await this.prisma.forecast.findMany({
      where: categoriaId
        ? {
            producto: {
              categoriaId,
            },
          }
        : {},
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            stockActual: true,
            precio: true,
            categoriaId: true,
            categoria: { select: { id: true, nombre: true } },
            marca: { select: { nombre: true } },
          },
        },
      },
      orderBy: [{ periodo: 'desc' }, { cantidadProyectada: 'desc' }],
    })

    // Agrupar por producto y quedarse con el pronóstico más reciente
    const forecastsPorProducto = new Map()

    for (const forecast of forecasts) {
      if (!forecastsPorProducto.has(forecast.productoId)) {
        forecastsPorProducto.set(forecast.productoId, {
          productoId: forecast.producto.id,
          productoNombre: forecast.producto.nombre,
          categoriaNombre: forecast.producto.categoria.nombre,
          categoriaId: forecast.producto.categoriaId,
          marcaNombre: forecast.producto.marca?.nombre || 'Sin marca',
          stockActual: forecast.producto.stockActual,
          precio: forecast.producto.precio,
          cantidadProyectada: Number(forecast.cantidadProyectada),
          nivelConfianza: Number(forecast.nivelConfianza) * 100,
          tendencia: forecast.tendencia,
          modelo: forecast.modelo,
          periodo: forecast.periodo,
          valorProyectado:
            Number(forecast.cantidadProyectada) * Number(forecast.producto.precio),
        })
      }
    }

    // Convertir a array y ordenar por cantidad proyectada (descendente)
    const topForecasts = Array.from(forecastsPorProducto.values()).sort(
      (a, b) => b.cantidadProyectada - a.cantidadProyectada,
    )

    return topForecasts
  }
}
