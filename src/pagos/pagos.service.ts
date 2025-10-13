import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import Stripe from 'stripe'

@Injectable()
export class PagosService {
  private stripe: Stripe

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    })
  }

  async crearPago(ordenId: number, monto: number, moneda: string) {
    try {
      const orden = await this.prisma.orden.findUnique({
        where: { id: ordenId },
        include: {
          user: true,
          items: { include: { producto: true } },
        },
      })

      if (!orden) throw new NotFoundException('Orden no encontrada')
      if (orden.estado !== 'PENDIENTE')
        throw new BadRequestException('La orden ya fue pagada o cancelada')

      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card','cashapp'],
        customer_email: orden.user.email,
        metadata: {
          ordenId: orden.id.toString(),
          userId: orden.userId.toString(),
        },
        line_items: orden.items.map((i) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: i.producto.nombre },
            unit_amount: Math.round(i.precioUnitario.toNumber() * 100),
          },
          quantity: i.cantidad,
        })),
     success_url: process.env.SUCCESS_URL,
cancel_url: process.env.CANCEL_URL,
        invoice_creation: { enabled: true }, // ⚡ CREA FACTURA AUTOMÁTICA AL PAGAR
      })

      await this.prisma.pago.upsert({
        where: { ordenId: orden.id },
        update: { stripeId: session.id, monto, estado: 'PENDIENTE' },
        create: { ordenId: orden.id, stripeId: session.id, monto, estado: 'PENDIENTE' },
      })

      return { url: session.url }
    } catch (error) {
      console.error('❌ Error al crear pago:', error)
      throw new BadRequestException('No se pudo crear el pago')
    }
  }

  async manejarEventoStripe(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const ordenId = Number(session.metadata?.ordenId)

        if (!ordenId) return

        await this.prisma.pago.updateMany({
          where: { stripeId: session.id },
          data: { estado: 'PAGADA' },
        })

        const orden = await this.prisma.orden.update({
          where: { id: ordenId },
          data: { estado: 'PAGADA' },
        })

        let facturaUrl: string | null = null

        try {
          // 🔥 Recuperar factura automática creada por Stripe
          if (session.invoice) {
            const invoice = await this.stripe.invoices.retrieve(
              session.invoice as string
            )
            facturaUrl = invoice.hosted_invoice_url ?? null
          } else if (session.payment_intent) {
            // Buscar factura asociada al PaymentIntent
           const pi = await this.stripe.paymentIntents.retrieve(
  session.payment_intent as string,
  { expand: ['latest_invoice'] }
)

// TypeScript no sabe que existe, así que lo tratamos como any
const latestInvoice = (pi as any).latest_invoice as Stripe.Invoice | null
facturaUrl = latestInvoice?.hosted_invoice_url ?? null

          }
        } catch (err) {
          console.error('❌ Error obteniendo factura de Stripe:', err)
        }

        await this.prisma.pago.updateMany({
          where: { stripeId: session.id },
          data: { facturaUrl },
        })

        console.log(`✅ Pago confirmado y factura vinculada a orden #${ordenId}`)
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }
  }

  async obtenerFactura(pagoId: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        orden: { include: { user: true } },
      },
    })
    if (!pago) throw new NotFoundException('Factura no encontrada')
    return pago
  }

  async listarFacturas() {
    return this.prisma.pago.findMany({
      include: {
        orden: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
