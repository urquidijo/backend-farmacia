import { IsString } from 'class-validator'

export class ConfirmarPagoDto {
  @IsString()
  stripeId: string
}
