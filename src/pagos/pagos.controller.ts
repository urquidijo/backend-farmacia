import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Res,
  Headers,
  HttpCode,
} from '@nestjs/common'
import { PagosService } from './pagos.service'
import { CrearPagoDto } from './dto/crear-pago.dto'
import type { Request, Response } from 'express'
import Stripe from 'stripe'

@Controller('pagos')
export class PagosController {
  private stripe: Stripe

  constructor(private readonly pagosService: PagosService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    })
  }

  /**
   * 🧾 Crear nueva sesión de pago
   */
  @Post('crear')
  async crearPago(@Body() dto: CrearPagoDto) {
    console.log('📦 Body recibido:', dto)
    return this.pagosService.crearPago(dto.ordenId, dto.monto, dto.moneda)
  }

  /**
   * 🧾 Obtener factura por ID
   */
  @Get('factura/:id')
  async obtenerFactura(@Param('id') id: string) {
    return this.pagosService.obtenerFactura(parseInt(id))
  }

  /**
   * 🧾 Listar facturas
   */
  @Get('facturas')
  async listarFacturas() {
    return this.pagosService.listarFacturas()
  }

  /**
   * 🔔 Webhook de Stripe
   */
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string
  ) {
    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(
        (req as any).rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      console.error('⚠️ Error verificando webhook:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    await this.pagosService.manejarEventoStripe(event)
    return res.json({ received: true })
  }
}
